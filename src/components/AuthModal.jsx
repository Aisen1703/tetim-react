import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:4000/api';

export default function AuthModal({ isOpen, onClose, onLogin }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  if (!isOpen) return null;

  function saveAuth(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  function showMessage(text, error = false) {
    setMessage(text);
    setIsError(error);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка входа');
      }

      saveAuth(data);
      showMessage('Успешный вход');

      if (onLogin) onLogin(data.user);

      setTimeout(() => {
        onClose();

        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/account');
        }
      }, 500);
    } catch (error) {
      showMessage(error.message, true);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка регистрации');
      }

      showMessage('Аккаунт создан. Теперь войдите.');
      setRegisterForm({
        name: '',
        email: '',
        phone: '',
        password: '',
      });

      setTimeout(() => {
        setMode('login');
      }, 700);
    } catch (error) {
      showMessage(error.message, true);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal auth-modal-sport" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-close" onClick={onClose}>
          ✕
        </button>

        <div className="auth-hero">
          <div className="auth-hero-badge">
            <img src="/assets/logo-full.png" alt="TETIM" className="auth-logo" />
          </div>

          <h2>{mode === 'login' ? 'Вход или регистрация' : 'Регистрация'}</h2>

          <p>
            {mode === 'login'
              ? 'Войдите в аккаунт, чтобы быстрее оформлять заказы и видеть историю покупок'
              : 'Создайте аккаунт для заказов, кабинета и персональных предложений'}
          </p>
        </div>

        <div className="auth-content">
          <div className="auth-switcher">
            <button
              type="button"
              className={`auth-switcher-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              Вход
            </button>

            <button
              type="button"
              className={`auth-switcher-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
            >
              Регистрация
            </button>
          </div>

          {mode === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="Введите email"
                  required
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="auth-field">
                <span>Пароль</span>
                <input
                  type="password"
                  placeholder="Введите пароль"
                  required
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </label>

              <button type="submit" className="auth-main-btn">
                Войти
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <label className="auth-field">
                <span>Имя</span>
                <input
                  type="text"
                  placeholder="Введите имя"
                  required
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="Введите email"
                  required
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="auth-field">
                <span>Телефон</span>
                <input
                  type="tel"
                  placeholder="+7 999 123 45 67"
                  required
                  value={registerForm.phone}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="auth-field">
                <span>Пароль</span>
                <input
                  type="password"
                  placeholder="Создайте пароль"
                  required
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </label>

              <button type="submit" className="auth-main-btn">
                Зарегистрироваться
              </button>
            </form>
          )}

          {message && (
            <div className={`auth-message ${isError ? 'error' : ''}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}