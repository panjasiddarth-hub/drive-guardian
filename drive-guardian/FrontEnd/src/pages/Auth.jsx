// src/pages/Auth.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from "../utils/api";

const glass = `
  backdrop-blur-xl bg-white/10 border border-white/20 
  shadow-2xl shadow-black/10 rounded-3xl overflow-hidden 
  transition-all duration-500
`;

export default function Auth() {
  const navigate = useNavigate();

  // Current view: 'login' | 'register' | 'forgot' | 'verify' | 'reset'
  const [view, setView] = useState('login');

  // Shared form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [company, setCompany] = useState('');
  const [adminName, setAdminName] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCompany('');
    setAdminName('');
    setOtp('');
    setError('');
    setMessage('');
  };

  // Login handler
const handleLogin = async (e) => {
  e.preventDefault();

  setError('');
  setMessage('');
  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    console.log('LOGIN RESPONSE →', data);

    if (res.ok && data.token) {
      // Save token
      localStorage.setItem('token', data.token);

      // Optional user storage
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setMessage('Login successful! Redirecting...');

      // Redirect
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } else {
      setError(data.message || 'Invalid email or password');
    }

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    setError('Cannot connect to server. Is backend running?');
  } finally {
    setLoading(false);
  }
};

  // Register handler
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!company || !adminName || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, adminName, email, password }),
      });

      const data = await res.json();

      setMessage(data.message);

      if (data.success) {
        setTimeout(() => {
          setView('login');
          resetForm();
        }, 2000);
      }
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password (send OTP)
  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`,{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('resetEmail', email);
        setMessage('OTP sent! Check your email.');
        setTimeout(() => setView('verify'), 2000);
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const resetEmail = localStorage.getItem('resetEmail');

    if (!resetEmail) {
      setError('Session expired. Please try forgot password again.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('OTP verified!');
        setTimeout(() => setView('reset'), 1500);
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const resetEmail = localStorage.getItem('resetEmail');

    if (!resetEmail) {
      setError('Session expired. Please try forgot password again.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, newPassword: password }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('Password reset successful!');
        localStorage.removeItem('resetEmail');
        setTimeout(() => {
          setView('login');
          resetForm();
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-300 via-indigo-350 to-gray-200 flex items-center justify-center p-6">
<div className={`${glass} w-full max-w-xl p-4 md:p-8 space-y-3 backdrop-blur-xl`}>        {/* Title based on current view */}
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-black tracking-tight">
            {view === 'login' && 'Welcome Back'}
            {view === 'register' && 'Create Account'}
            {view === 'forgot' && 'Forgot Password'}
            {view === 'verify' && 'Enter OTP'}
            {view === 'reset' && 'Reset Password'}
          </h2>
          <p className="mt-3 text-gray-300">
            {view === 'login' && 'Login to your fleet dashboard'}
            {view === 'register' && 'Register your company with FleetTrack'}
            {view === 'forgot' && 'Enter your registered email to receive an OTP'}
            {view === 'verify' && 'We sent a 6-digit OTP to your email'}
            {view === 'reset' && 'Enter your new password'}
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="bg-green-500/20 border border-green-500/40 text-green-300 px-4 py-3 rounded-xl text-center">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-md font-medium text-blue-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-md font-medium text-blue-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-xl hover:shadow-2xl ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Company Name</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition"
                placeholder="Your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">Admin Full Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition"
                placeholder="Full name of admin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition"
                placeholder="admin@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition"
                placeholder="Create strong password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition"
                placeholder="Confirm password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-xl hover:shadow-2xl ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition"
                placeholder="Enter your registered email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-xl hover:shadow-2xl ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Verify OTP Form */}
        {view === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition text-center text-2xl tracking-widest"
                placeholder="Enter 6-digit OTP"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-xl hover:shadow-2xl ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {/* Reset Password Form */}
        {view === 'reset' && (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-xl hover:shadow-2xl ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Footer links */}
        <div className="text-center text-blue-600 text-md space-y-5 mt-8">
          {view === 'login' && (
            <>
              <div>
                Forgot password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot');
                    resetForm();
                  }}
                  className="text-indigo-400 hover:text-indigo-300 transition"
                >
                  Reset here
                </button>
              </div>
              <div>
                New here?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('register');
                    resetForm();
                  }}
                  className="text-indigo-400 hover:text-indigo-300 transition font-medium"
                >
                  Create an Account
                </button>
              </div>
            </>
          )}

          {view === 'register' && (
            <div>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  resetForm();
                }}
                className="text-indigo-800 hover:text-indigo-900 transition font-medium"
              >
                Login
              </button>
            </div>
          )}

          {(view === 'forgot' || view === 'verify' || view === 'reset') && (
            <div>
              Remembered password?{' '}
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  resetForm();
                }}
                className="text-indigo-400 hover:text-indigo-300 transition"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}