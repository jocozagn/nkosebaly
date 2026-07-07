'use client'
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported, Messaging, MessagePayload } from 'firebase/messaging'
import firebase from "firebase/compat/app"
import { getAuth, Auth } from "firebase/auth"
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import { setFcmTokenData } from '@/redux/reducers/settingsSlice'

interface FirebaseConfig {
  apiKey: string | undefined
  authDomain: string | undefined
  projectId: string | undefined
  storageBucket: string | undefined
  messagingSenderId: string | undefined
  appId: string | undefined
  measurementId: string | undefined
}

interface FirebaseDataReturn {
  authentication: Auth
  fetchToken: (setTokenFound: (found: boolean) => void, setFcmToken: (token: string | null) => void) => Promise<void>
  onMessageListener: () => Promise<MessagePayload | null>
  signOut: () => Promise<void>
}

const FirebaseData = (): FirebaseDataReturn => {
  const dispatch = useDispatch()

  const firebaseConfig: FirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_API_KEY  || "",
    authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_APP_ID || "",
    measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID || ""
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig)
  }

  const authentication = getAuth()

  const firebaseApp: FirebaseApp = !getApps().length
    ? initializeApp(firebaseConfig)
    : getApp()

  const messagingInstance = async (): Promise<Messaging | null> => {
    try {
      const isSupportedBrowser = await isSupported()
      if (isSupportedBrowser) {
        return getMessaging(firebaseApp)
      }
      return null
    } catch (err) {
      console.error('Error checking messaging support:', err)
      return null
    }
  }

  const fetchToken = async (
    setTokenFound: (found: boolean) => void,
    setFcmToken: (token: string | null) => void
  ): Promise<void> => {
    const messaging = await messagingInstance()
    if (!messaging) {
      console.error('Messaging not supported.')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        try {
          const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY || "",
          })
          
          if (currentToken) {
            setTokenFound(true)
            setFcmToken(currentToken)
            dispatch(setFcmTokenData(currentToken))
          } else {
            setTokenFound(false)
            setFcmToken(null)
            toast.error('Permission is required to receive notifications.')
          }
        } catch (err) {
          console.error('Error retrieving token:', err)
          if (err instanceof Error && err.message.includes('no active Service Worker')) {
            await registerServiceWorker(setTokenFound, setFcmToken)
          }
        }
      } else {
        setTokenFound(false)
        setFcmToken(null)
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err)
    }
  }

  const registerServiceWorker = async (
    setTokenFound: (found: boolean) => void,
    setFcmToken: (token: string | null) => void
  ): Promise<void> => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        console.log('Service Worker registration successful with scope: ', registration.scope)
        await fetchToken(setTokenFound, setFcmToken)
      } catch (err) {
        console.error('Service Worker registration failed: ', err)
      }
    }
  }

  const onMessageListener = async (): Promise<MessagePayload | null> => {
    const messaging = await messagingInstance()
    if (messaging) {
      return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
          resolve(payload)
        })
      })
    }
    console.error('Messaging not supported.')
    return null
  }

  const signOut = async (): Promise<void> => {
    return authentication.signOut()
  }

  return { authentication, fetchToken, onMessageListener, signOut }
}

export default FirebaseData
