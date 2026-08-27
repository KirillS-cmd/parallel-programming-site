import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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
      // Сохраняем креды для восстановления сессии
      sessionStorage.setItem('teacherEmail', email);
      sessionStorage.setItem('teacherPassword', password);
      return { success: true };
    } else {
      await signOut(auth);
      return { success: false, error: 'Нет прав педагога' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function registerTeacher(email, password, name, city, school, phone) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', userCred.user.uid), {
      email, role: 'teacher', name, city, school, phone,
      isConfirmed: true, teacherId: null, createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function loginStudent(login, password) {
  try {
    const q = query(collection(db, 'studentClasses'), where('login', '==', login));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false, error: 'Неверный логин' };
    const data = snap.docs[0].data();
    if (data.password !== password) return { success: false, error: 'Неверный пароль' };
    const userDoc = await getDoc(doc(db, 'users', data.studentId));
    if (!userDoc.exists()) return { success: false, error: 'Ученик не найден' };
    await signInWithEmailAndPassword(auth, userDoc.data().email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function logout() {
  sessionStorage.removeItem('teacherEmail');
  sessionStorage.removeItem('teacherPassword');
  await signOut(auth);
}

export function onAuthStateChangedListener(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) callback({ user, role: docSnap.data().role, userData: docSnap.data() });
      else { await signOut(auth); callback(null); }
    } else callback(null);
  });
}