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
    if (userDoc.exists() && userDoc.data().role === 'teacher') {
      return { success: true };
    } else {
      await signOut(auth);
      return { success: false, error: 'У вас нет прав педагога' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ------------------ Регистрация педагога ------------------
export async function registerTeacher(email, password, name, city, school, phone) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;
    await setDoc(doc(db, 'users', uid), {
      email,
      role: 'teacher',
      name,
      city,
      school,
      phone,
      isConfirmed: true,
      teacherId: null
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ------------------ Вход ученика (по логину/паролю) ------------------
export async function loginStudent(login, password) {
  // Находим запись в studentClasses
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
    return { success: false, error: 'Пользователь не найден' };
  }
  // Входим через Firebase Auth (используем email, который хранится в users)
  const email = userDoc.data().email;
  // Пароль мы сохранили при создании ученика – он используется для входа
  // Значит, при создании ученика мы создаём пользователя с этим паролем.
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Ошибка входа: ' + error.message };
  }
}

// ------------------ Выход ------------------
export async function logout() {
  await signOut(auth);
}

// ------------------ Слушатель состояния авторизации ------------------
export function onAuthStateChangedListener(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        callback({ user, role: userData.role, userData });
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

// ------------------ Получить текущего пользователя с ролью (для проверок) ------------------
export async function getCurrentUserWithRole() {
  const user = auth.currentUser;
  if (!user) return null;
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) return null;
  return { user, role: userDoc.data().role, userData: userDoc.data() };
}