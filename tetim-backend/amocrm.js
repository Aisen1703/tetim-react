require('dotenv').config();

const fs = require('fs');
const path = require('path');

const TOKENS_FILE = path.join(__dirname, 'amo-tokens.json');

function getAmoBaseUrl() {
  return `https://${process.env.AMO_SUBDOMAIN}.amocrm.ru`;
}

function readTokens() {
  if (fs.existsSync(TOKENS_FILE)) {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  }

  return {
    access_token: process.env.AMO_ACCESS_TOKEN || '',
    refresh_token: process.env.AMO_REFRESH_TOKEN || '',
    expires_at: 0,
  };
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

async function refreshAmoToken() {
  const tokens = readTokens();

  if (!tokens.refresh_token) {
    throw new Error('Нет AMO_REFRESH_TOKEN');
  }

  const response = await fetch(`${getAmoBaseUrl()}/oauth2/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: process.env.AMO_CLIENT_ID,
      client_secret: process.env.AMO_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      redirect_uri: process.env.AMO_REDIRECT_URI
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('amoCRM refresh error:', data);
    throw new Error('Не удалось обновить amoCRM token');
  }

  const nextTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + Number(data.expires_in || 86400) * 1000
  };

  saveTokens(nextTokens);

  return nextTokens.access_token;
}

async function getAmoAccessToken() {
  const tokens = readTokens();

  if (!tokens.access_token) {
    return refreshAmoToken();
  }

  if (Date.now() > Number(tokens.expires_at || 0) - 60000) {
    return refreshAmoToken();
  }

  return tokens.access_token;
}

async function amoRequest(pathname, options = {}) {
  const accessToken = await getAmoAccessToken();

  const response = await fetch(`${getAmoBaseUrl()}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('amoCRM API error:', data);
    throw new Error('Ошибка запроса amoCRM');
  }

  return data;
}

function buildOrderText(order) {
  const itemsText = order.items
    .map((item, index) => {
      return `${index + 1}. ${item.name} — ${item.quantity} шт. × ${item.price} ₽`;
    })
    .join('\n');

  return [
    'Заказ с сайта TETIM',
    '',
    `Клиент: ${order.customer.name}`,
    `Телефон: ${order.customer.phone}`,
    `Email: ${order.customer.email || 'не указан'}`,
    `Тип получения: ${order.deliveryType === 'pickup' ? 'Самовывоз' : 'Доставка'}`,
    `Адрес: ${order.address || 'самовывоз, ул. Дежнева, д. 30'}`,
    `Комментарий: ${order.comment || 'нет'}`,
    '',
    'Товары:',
    itemsText,
    '',
    `Сумма: ${order.total} ₽`
  ].join('\n');
}

async function sendOrderToAmo(order) {
  if (process.env.AMO_ENABLED !== 'true') {
    console.log('amoCRM отключена. Заказ не отправлен в amoCRM.');
    return null;
  }

  const contactPayload = [
    {
      name: order.customer.name,
      custom_fields_values: [
        {
          field_code: 'PHONE',
          values: [
            {
              value: order.customer.phone
            }
          ]
        },
        ...(order.customer.email
          ? [
              {
                field_code: 'EMAIL',
                values: [
                  {
                    value: order.customer.email
                  }
                ]
              }
            ]
          : [])
      ]
    }
  ];

  const contactsResult = await amoRequest('/api/v4/contacts', {
    method: 'POST',
    body: JSON.stringify(contactPayload)
  });

  const contactId = contactsResult?._embedded?.contacts?.[0]?.id;

  const leadPayload = [
    {
      name: `Заказ TETIM — ${order.customer.name}`,
      price: Number(order.total || 0),
      tags: [
        {
          name: 'Сайт TETIM'
        }
      ],
      _embedded: contactId
        ? {
            contacts: [
              {
                id: contactId
              }
            ]
          }
        : undefined
    }
  ];

  const leadsResult = await amoRequest('/api/v4/leads', {
    method: 'POST',
    body: JSON.stringify(leadPayload)
  });

  const leadId = leadsResult?._embedded?.leads?.[0]?.id;

  if (leadId) {
    await amoRequest(`/api/v4/leads/${leadId}/notes`, {
      method: 'POST',
      body: JSON.stringify([
        {
          note_type: 'common',
          params: {
            text: buildOrderText(order)
          }
        }
      ])
    });
  }

  return {
    contactId,
    leadId
  };
}

module.exports = {
  sendOrderToAmo
};