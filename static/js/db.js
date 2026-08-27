import { db } from './firebase-config.js';
import { 
  collection, doc, setDoc, getDoc, getDocs, query, where, 
  updateDoc, deleteDoc, addDoc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { generateLogin, generatePassword } from './utils.js';
import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

export async function createClass(teacherId, className) {
  const ref = await addDoc(collection(db, 'classes'), { name: className, teacherId, createdAt: new Date().toISOString() });
  return ref.id;
}

export async function getClasses(teacherId) {
  const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getClass(classId) {
  const docSnap = await getDoc(doc(db, 'classes', classId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function addStudent(teacherId, classId, fullName) {
  // Проверяем, есть ли уже ученик с таким именем у этого учителя
  const q = query(collection(db, 'users'), where('teacherId', '==', teacherId), where('name', '==', fullName));
  const snap = await getDocs(q);
  let studentId, login, password;
  if (!snap.empty) {
    // Ученик уже существует – проверяем, в этом ли он классе
    const existing = snap.docs[0];
    studentId = existing.id;
    const check = query(collection(db, 'studentClasses'), where('studentId', '==', studentId), where('classId', '==', classId));
    const checkSnap = await getDocs(check);
    if (!checkSnap.empty) return { success: false, error: 'Ученик уже в этом классе' };
    // Если не в этом классе – генерируем новые логин/пароль
    login = generateLogin(fullName);
    password = generatePassword(8);
  } else {
    // Создаём нового пользователя Firebase
    login = generateLogin(fullName);
    password = generatePassword(8);
    const email = `${login}@temp.local`;
    try {
      // Сохраняем текущие креды педагога (если есть)
      const teacherEmail = sessionStorage.getItem('teacherEmail');
      const teacherPassword = sessionStorage.getItem('teacherPassword');
      
      // Создаём ученика
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      studentId = userCred.user.uid;
      await setDoc(doc(db, 'users', studentId), {
        email, role: 'student', name: fullName, teacherId, isConfirmed: true,
        city: '', school: '', phone: ''
      });
      
      // Восстанавливаем сессию педагога, если она была
      if (teacherEmail && teacherPassword) {
        await signOut(auth);
        await signInWithEmailAndPassword(auth, teacherEmail, teacherPassword);
      }
    } catch (err) {
      return { success: false, error: 'Ошибка создания пользователя: ' + err.message };
    }
  }
  // Добавляем связь в studentClasses (если ученик уже существовал, но не в этом классе)
  await addDoc(collection(db, 'studentClasses'), {
    studentId, classId, login, password, createdAt: new Date().toISOString()
  });
  return { success: true, login, password };
}

// Остальные функции (getStudentsWithProgress, removeStudentFromClass, markProgress и т.д.) остаются без изменений.
export async function getStudentsWithProgress(classId) {
  const q = query(collection(db, 'studentClasses'), where('classId', '==', classId));
  const snap = await getDocs(q);
  const students = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const studentId = data.studentId;
    const userDoc = await getDoc(doc(db, 'users', studentId));
    if (!userDoc.exists()) continue;
    const userData = userDoc.data();
    const progressQ = query(collection(db, 'progress'), where('studentId', '==', studentId));
    const progressSnap = await getDocs(progressQ);
    const progressMap = {};
    progressSnap.docs.forEach(p => {
      const pd = p.data();
      progressMap[`${pd.section}_${pd.itemId}`] = pd;
    });
    let practiceDone = 0;
    for (let i = 1; i <= 5; i++) {
      if (progressMap[`practice_task${i}`]?.completed) practiceDone++;
    }
    const practicePercent = Math.round((practiceDone / 5) * 100);
    const codeExists = progressMap['practice_task5'] && progressMap['practice_task5'].answer ? true : false;
    students.push({
      id: studentId,
      name: userData.name,
      login: data.login,
      password: data.password,
      practicePercent,
      codeExists,
      studentClassId: docSnap.id,
      progress: progressMap
    });
  }
  return students;
}

export async function removeStudentFromClass(studentClassId) {
  await deleteDoc(doc(db, 'studentClasses', studentClassId));
}

export async function markProgress(studentId, section, itemId, completed = true, extra = {}) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId), where('section', '==', section), where('itemId', '==', itemId));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'progress'), {
      studentId, section, itemId, completed,
      score: extra.score || 0,
      answer: extra.answer || null,
      checkedByTeacher: extra.checkedByTeacher || false,
      timestamp: new Date().toISOString()
    });
  } else {
    const ref = snap.docs[0].ref;
    await updateDoc(ref, { completed, ...extra });
  }
}

export async function getProgress(studentId) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const result = {};
  snap.docs.forEach(d => {
    const data = d.data();
    result[`${data.section}_${data.itemId}`] = data;
  });
  return result;
}

export async function getStudentCode(studentId) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId), where('section', '==', 'practice'), where('itemId', '==', 'task5'));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].data();
}

export async function markCodeChecked(studentId) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId), where('section', '==', 'practice'), where('itemId', '==', 'task5'));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const ref = snap.docs[0].ref;
    await updateDoc(ref, { completed: true, checkedByTeacher: true });
  }
}

export async function getUser(userId) {
  const docSnap = await getDoc(doc(db, 'users', userId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}