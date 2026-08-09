import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// ------------------ Вход педагога ------------------
export async function loginTeacher(email, password) {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      await signOut(auth);
      return { success: false, error: 'Пользователь не найден в базе данных.' };
    }
    const userData = userDoc.data();
    if (userData.role === 'teacher') {
      return { success: true };
    } else {
      await signOut(auth);
      return { success: false, error: 'У вас нет прав педагога. Ваша роль: ' + userData.role };
    }
  } catch (error) {
    console.error('Ошибка входа:', error);
    return { success: false, error: error.message };
  }
}

// ------------------ Регистрация педагога ------------------
export async function registerTeacher(email, password, name, city, school, phone) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;
    await setDoc(doc(db, 'users', uid), {
      email: email,
      role: 'teacher',
      name: name,
      city: city,
      school: school,
      phone: phone,
      isConfirmed: true,
      teacherId: null,
      createdAt: new Date().toISOString()
    });
    console.log('Регистрация успешна, пользователь создан:', uid);
    return { success: true };
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    return { success: false, error: error.message };
  }
}

// ------------------ Вход ученика ------------------
export async function loginStudent(login, password) {
  try {
    const q = query(collection(db, 'studentClasses'), where('login', '==', login));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { success: false, error: 'Неверный логин' };
    }
    const data = snapshot.docs[0].data();
    if (data.password !== password) {
      return { success: false, error: 'Неверный пароль' };
    }
    const studentId = data.studentId;
    const userDoc = await getDoc(doc(db, 'users', studentId));
    if (!userDoc.exists()) {
      return { success: false, error: 'Учётная запись ученика не найдена' };
    }
    const email = userDoc.data().email;
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (error) {
    console.error('Ошибка входа ученика:', error);
    return { success: false, error: error.message };
  }
}

// ------------------ Выход ------------------
export async function logout() {
  await signOut(auth);
}

// ------------------ Слушатель состояния ------------------
export function onAuthStateChangedListener(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          callback({ user, role: userData.role, userData });
        } else {
          await signOut(auth);
          callback(null);
        }
      } catch (err) {
        console.error('Ошибка загрузки данных пользователя:', err);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

// ------------------ Получить текущего пользователя ------------------
export async function getCurrentUserWithRole() {
  const user = auth.currentUser;
  if (!user) return null;
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) return null;
  return { user, role: userDoc.data().role, userData: userDoc.data() };
}