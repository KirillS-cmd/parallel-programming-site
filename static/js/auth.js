import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/**
 * Вход педагога по email и паролю
 */
export async function loginTeacher(email, password) {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      await signOut(auth);
      return { success: false, error: 'Пользователь не найден в БД' };
    }
    if (userDoc.data().role === 'teacher') {
      return { success: true };
    } else {
      await signOut(auth);
      return { success: false, error: 'Нет прав педагога' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Регистрация педагога с записью данных в Firestore
 */
export async function registerTeacher(email, password, name, city, school, phone) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', userCred.user.uid), {
      email, role: 'teacher', name, city, school, phone,
      isConfirmed: true, teacherId: null, createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Ошибка регистрации педагога:', error.code, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Вход ученика по логину и паролю (с подробным логированием)
 */
export async function loginStudent(login, password) {
  try {
    console.log('Попытка входа ученика с логином:', login);
    
    // 1. Ищем запись в studentClasses по логину
    const q = query(collection(db, 'studentClasses'), where('login', '==', login));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.error('Логин не найден в studentClasses:', login);
      return { success: false, error: 'Неверный логин' };
    }
    
    // Берём первый документ (логин должен быть уникальным)
    const data = snap.docs[0].data();
    console.log('Найдена запись studentClass:', data);
    
    // 2. Проверяем пароль
    if (data.password !== password) {
      console.error('Пароль не совпадает для логина:', login);
      return { success: false, error: 'Неверный пароль' };
    }
    
    // 3. Получаем данные пользователя по studentId
    const userDoc = await getDoc(doc(db, 'users', data.studentId));
    if (!userDoc.exists()) {
      console.error('Пользователь с studentId не найден:', data.studentId);
      return { success: false, error: 'Ученик не найден' };
    }
    
    const userData = userDoc.data();
    console.log('Найден пользователь:', userData);
    
    // 4. Вход через Firebase Auth с email и паролем
    await signInWithEmailAndPassword(auth, userData.email, password);
    console.log('Вход ученика успешен!');
    return { success: true };
    
  } catch (error) {
    console.error('Ошибка входа ученика:', error.code, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Выход из аккаунта
 */
export async function logout() {
  await signOut(auth);
}

/**
 * Слушатель изменения состояния авторизации
 */
export function onAuthStateChangedListener(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        callback({ user, role: docSnap.data().role, userData: docSnap.data() });
      } else {
        await signOut(auth);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}