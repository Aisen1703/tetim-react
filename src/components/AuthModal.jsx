import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function AuthModal({ isOpen, onClose, onLogin }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [loginForm, setLoginForm] = useState({
    email: 'admin@tetim.ru',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const [resetForm, setResetForm] = useState({
    login: '',
    method: 'sms',
    code: '',
    newPassword: '',
  });

  const [resetStep, setResetStep] = useState('request');
  const [devCode, setDevCode] = useState('');

  if (!isOpen) {
    return null;
  }

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        setMessage(data.message || 'Ошибка входа');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      onLogin?.(data.user);
      onClose?.();

      window.location.reload();
    } catch {
      setMessage('Backend не отвечает. Проверьте server.js');
    } finally {
      setLoading(false);
    }
  }

  async function register(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerForm),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        setMessage(data.message || 'Ошибка регистрации');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      onLogin?.(data.user);
      onClose?.();

      window.location.reload();
    } catch {
      setMessage('Backend не отвечает. Проверьте server.js');
    } finally {
      setLoading(false);
    }
  }

  async function requestResetCode(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: resetForm.login,
          method: resetForm.method,
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        setMessage(data.message || 'Не удалось отправить код');
        return;
      }

      setDevCode(data.dev_code || '');
      setResetStep('code');
      setMessage(data.message || 'Код отправлен');
    } catch {
      setMessage('Backend не отвечает. Проверьте server.js');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: resetForm.login,
          code: resetForm.code,
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        setMessage(data.message || 'Неверный код');
        return;
      }

      setResetStep('password');
      setMessage('Код подтверждён');
    } catch {
      setMessage('Backend не отвечает. Проверьте server.js');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: resetForm.login,
          code: resetForm.code,
          newPassword: resetForm.newPassword,
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        setMessage(data.message || 'Не удалось изменить пароль');
        return;
      }

      setMessage('Пароль изменён. Теперь войдите.');
      setMode('login');
      setResetStep('request');
      setLoginForm((prev) => ({
        ...prev,
        email: resetForm.login.includes('@') ? resetForm.login : prev.email,
        password: '',
      }));
    } catch {
      setMessage('Backend не отвечает. Проверьте server.js');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="auth-close" onClick={onClose}>
          ×
        </button>

        {mode === 'login' && (
          <>
            <h2>Вход</h2>
            <p>Войдите в аккаунт TETIM</p>

            <form className="auth-form" onSubmit={login}>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="Email"
                required
              />

              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder="Пароль"
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? 'Входим...' : 'Войти'}
              </button>
            </form>

            <button
              type="button"
              className="auth-link-btn"
              onClick={() => {
                setMode('forgot');
                setMessage('');
              }}
            >
              Забыли пароль?
            </button>

            <button
              type="button"
              className="auth-link-btn"
              onClick={() => {
                setMode('register');
                setMessage('');
              }}
            >
              Создать аккаунт
            </button>
          </>
        )}

        {mode === 'register' && (
          <>
            <h2>Регистрация</h2>
            <p>Создайте аккаунт TETIM</p>

            <form className="auth-form" onSubmit={register}>
              <input
                value={registerForm.name}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Имя"
                required
              />

              <input
                type="email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="Email"
                required
              />

              <input
                value={registerForm.phone}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
                placeholder="Телефон"
              />

              <input
                type="password"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder="Пароль"
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? 'Создаём...' : 'Зарегистрироваться'}
              </button>
            </form>

            <button
              type="button"
              className="auth-link-btn"
              onClick={() => {
                setMode('login');
                setMessage('');
              }}
            >
              Уже есть аккаунт
            </button>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <h2>Восстановление пароля</h2>
            <p>Выберите, куда отправить код</p>

            {resetStep === 'request' && (
              <form className="auth-form" onSubmit={requestResetCode}>
                <input
                  value={resetForm.login}
                  onChange={(event) =>
                    setResetForm((prev) => ({
                      ...prev,
                      login: event.target.value,
                    }))
                  }
                  placeholder="Email или телефон"
                  required
                />

                <div className="reset-methods">
                  <label className={resetForm.method === 'sms' ? 'reset-method active' : 'reset-method'}>
                    <input
                      type="radio"
                      name="reset-method"
                      value="sms"
                      checked={resetForm.method === 'sms'}
                      onChange={(event) =>
                        setResetForm((prev) => ({
                          ...prev,
                          method: event.target.value,
                        }))
                      }
                    />
                    <span>SMS</span>
                  </label>

                  <label className={resetForm.method === 'email' ? 'reset-method active' : 'reset-method'}>
                    <input
                      type="radio"
                      name="reset-method"
                      value="email"
                      checked={resetForm.method === 'email'}
                      onChange={(event) =>
                        setResetForm((prev) => ({
                          ...prev,
                          method: event.target.value,
                        }))
                      }
                    />
                    <span>Email</span>
                  </label>
                </div>

                <button type="submit" disabled={loading}>
                  {loading ? 'Отправляем...' : 'Получить код'}
                </button>
              </form>
            )}

            {resetStep === 'code' && (
              <form className="auth-form" onSubmit={verifyCode}>
                <input
                  value={resetForm.code}
                  onChange={(event) =>
                    setResetForm((prev) => ({
                      ...prev,
                      code: event.target.value,
                    }))
                  }
                  placeholder="Код"
                  required
                />

                {devCode && (
                  <div className="auth-dev-code">
                    Тестовый код: <strong>{devCode}</strong>
                  </div>
                )}

                <button type="submit" disabled={loading}>
                  Подтвердить код
                </button>
              </form>
            )}

            {resetStep === 'password' && (
              <form className="auth-form" onSubmit={resetPassword}>
                <input
                  type="password"
                  value={resetForm.newPassword}
                  onChange={(event) =>
                    setResetForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  placeholder="Новый пароль"
                  required
                />

                <button type="submit" disabled={loading}>
                  Сменить пароль
                </button>
              </form>
            )}

            <button
              type="button"
              className="auth-link-btn"
              onClick={() => {
                setMode('login');
                setResetStep('request');
                setMessage('');
              }}
            >
              Вернуться ко входу
            </button>
          </>
        )}

        {message && <div className="auth-message">{message}</div>}
      </div>
    </div>
  );
}