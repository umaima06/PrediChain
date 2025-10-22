import React, { useState } from 'react';
import LiquidEther from '../components/LiquidEther';
import axiosInstance from "../components/axiosConfig.js";
import { FaGoogle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper: check username uniqueness (simple approach using users collection)
  async function isUsernameTaken(u) {
    if (!u) return false;
    // We store usernames as a map doc 'usernames/{username}' to enforce uniqueness.
    const snap = await getDoc(doc(db, 'usernames', u.toLowerCase()));
    return snap.exists();
  }

  // When new user signs up with email
  async function handleEmailSignup(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // check username
      const taken = await isUsernameTaken(username);
      if (taken) {
        alert('Username taken — choose another.');
        setLoading(false);
        return;
      }

      const res = await createUserWithEmailAndPassword(auth, email, password);
      // update firebase auth profile
      await updateProfile(res.user, { displayName: username });

      // store user doc
      await setDoc(doc(db, 'users', res.user.uid), {
        uid: res.user.uid,
        email: res.user.email,
        username,
        provider: 'password',
        createdAt: new Date().toISOString()
      });

      // write a username lock for uniqueness
      await setDoc(doc(db, 'usernames', username.toLowerCase()), {
        uid: res.user.uid,
        username,
        createdAt: new Date().toISOString()
      });

       // optional: get token
       const token = await res.user.getIdToken();
       console.log('Signed up. ID token:', token);
       
       navigate('/projects');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Signup failed');
      } finally {
        setLoading(false);
      }
    }


  async function handleEmailLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const token = await res.user.getIdToken();
      console.log('Logged in. ID token:', token);
      navigate('/projects');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const u = res.user;
      // merge user into Firestore (if new user, create record)
      await setDoc(doc(db, 'users', u.uid), {
        uid: u.uid,
        email: u.email,
        username: u.displayName || '',
        provider: 'google',
        photoURL: u.photoURL || '',
        createdAt: new Date().toISOString()
      }, { merge: true });

      // note: we are NOT reserving username for google users automatically.
      const token = await u.getIdToken();
      console.log('Google sign-in token:', token);

      // Call backend with token
      navigate('/projects');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* LiquidEther Background */}
      <LiquidEther
        colors={['#5C3AFF', '#A883FF', '#52FF99']}
        mouseForce={20}
        cursorSize={50}
        isViscous={false}
        viscous={30}
        iterationsViscous={32}
        iterationsPoisson={32}
        resolution={0.5}
        isBounce={false}
        autoDemo={true}
        autoSpeed={0.5}
        autoIntensity={2.2}
        takeoverDuration={0.25}
        autoResumeDelay={3000}
        autoRampDuration={0.6}
      />

      {/* Form Box */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="relative w-full max-w-5xl h-[550px] flex rounded-3xl overflow-hidden shadow-2xl bg-white/10 dark:bg-black/40 backdrop-blur-xl">
          
          {/* Sliding Panels */}
          <div className="relative w-full flex transition-transform duration-700"
               style={{ transform: isLogin ? 'translateX(0%)' : 'translateX(-50%)' }}>
            
            {/* Left Side Panel (Text for Login) */}
            <div className="w-1/2 p-12 flex flex-col justify-center bg-gradient-to-b from-[#5C3AFF] to-[#A883FF] text-white">
              <h2 className="text-4xl font-bold mb-4">{isLogin ? 'Welcome Back!' : 'Hello There!'}</h2>
              <p className="text-white/90">
                {isLogin 
                  ? 'Sign in to access your dashboard and smart forecasting tools.' 
                  : 'Sign up now to start optimizing your material procurement with AI.'}
              </p>
            </div>

            {/* Right Side Panel (Form Box) */}
            <div className="w-1/2 p-12 flex flex-col justify-center bg-white dark:bg-gray-900 rounded-r-3xl transition-colors duration-500">
              <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">{isLogin ? 'Sign In' : 'Sign Up'}</h2>
              
              <form className="flex flex-col gap-4"
                onSubmit={isLogin ? handleEmailLogin : handleEmailSignup}>
                {!isLogin && (
                  <div className="flex flex-col">
                    <label className="mb-1 font-semibold text-gray-700 dark:text-gray-200">Username</label>
                    <input
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#5C3AFF]"
                    />
                  </div>
                )}
                
                <div className="flex flex-col">
                  <label className="mb-1 font-semibold text-gray-700 dark:text-gray-200">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#5C3AFF]"
                    autoComplete="email"
                  />
                </div>
                
                <div className="flex flex-col">
                  <label className="mb-1 font-semibold text-gray-700 dark:text-gray-200">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#5C3AFF]"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                </div>

                <button
                  type="submit"
                  className="mt-4 bg-gradient-to-r from-[#5C3AFF] to-[#A883FF] text-white py-2 rounded-lg font-semibold hover:opacity-90 transition transform hover:scale-105"
                >
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </button>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="mt-2 border border-[#5C3AFF] py-2 rounded-lg flex items-center justify-center gap-2 text-[#5C3AFF] hover:bg-[#5C3AFF]/20 transition"
                >
                  <FaGoogle /> {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
                </button>
              </form>

              <p className="mt-6 text-sm text-gray-700 dark:text-gray-300">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                <span
                  className="text-[#5C3AFF] font-semibold cursor-pointer hover:underline"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
              <div className="absolute top-6 left-6 z-20">
  <a
    href="/"
    className="text-white dark:text-white text-2xl font-bold hover:scale-110 transition transform"
    aria-label="Back to Home"
  >
    ←
  </a>
</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;