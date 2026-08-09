import { db } from './firebase-config.js';
import { 
  collection, doc, setDoc, getDoc, getDocs, query, where, 
  updateDoc, deleteDoc, addDoc, arrayUnion, arrayRemove, writeBatch 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { generateLogin, generatePassword } from './utils.js';
import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// ------------------ КЛАССЫ ------------------
export async function createClass(teacherId, className) {
  const docRef = await addDoc(collection(db, 'classes'), {
    name: className,
    teacherId: teacherId,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function getClasses(teacherId) {
  const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getClass(classId) {
  const docSnap = await getDoc(doc(db, 'classes', classId));
  if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
  return null;
}

// ------------------ УЧЕНИКИ ------------------
export async function addStudent(teacherId, classId, fullName) {
  const q = query(collection(db, 'users'), where('teacherId', '==', teacherId), where('name', '==', fullName));
  const snap = await getDocs(q);
  let studentId;
  let login, password;
  if (!snap.empty) {
    const existingUser = snap.docs[0];
    studentId = existingUser.id;
    const classCheck = query(collection(db, 'studentClasses'), where('studentId', '==', studentId), where('classId', '==', classId));
    const classSnap = await getDocs(classCheck);
    if (!classSnap.empty) {
      return { success: false, error: 'Ученик уже в этом классе' };
    }
    login = generateLogin(fullName);
    password = generatePassword(8);
  } else {
    login = generateLogin(fullName);
    password = generatePassword(8);
    const email = `${login}@temp.local`;
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      studentId = userCred.user.uid;
      await setDoc(doc(db, 'users', studentId), {
        email,
        role: 'student',
        name: fullName,
        teacherId: teacherId,
        isConfirmed: true,
        city: '',
        school: '',
        phone: ''
      });
    } catch (err) {
      console.error('Ошибка создания ученика:', err);
      return { success: false, error: 'Ошибка создания пользователя: ' + err.message };
    }
  }
  await addDoc(collection(db, 'studentClasses'), {
    studentId,
    classId,
    login,
    password,
    createdAt: new Date().toISOString()
  });
  return { success: true, login, password };
}

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
      const pData = p.data();
      progressMap[`${pData.section}_${pData.itemId}`] = pData;
    });
    let practiceDone = 0;
    for (let i = 1; i <= 5; i++) {
      if (progressMap[`practice_task${i}`]?.completed) practiceDone++;
    }
    const practicePercent = Math.round((practiceDone / 5) * 100);
    const codeProgress = progressMap['practice_task5'];
    const codeExists = codeProgress && codeProgress.answer && codeProgress.answer.length > 0;
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

// ------------------ ПРОГРЕСС ------------------
export async function markProgress(studentId, section, itemId, completed = true, extra = {}) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId), where('section', '==', section), where('itemId', '==', itemId));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'progress'), {
      studentId,
      section,
      itemId,
      completed,
      score: extra.score || 0,
      answer: extra.answer || null,
      checkedByTeacher: extra.checkedByTeacher || false,
      timestamp: new Date().toISOString()
    });
  } else {
    const ref = snap.docs[0].ref;
    await updateDoc(ref, {
      completed,
      ...extra
    });
  }
}

export async function getProgress(studentId) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const result = {};
  snap.docs.forEach(doc => {
    const data = doc.data();
    result[`${data.section}_${data.itemId}`] = data;
  });
  return result;
}

// ------------------ КОД УЧЕНИКА ------------------
export async function getStudentCode(studentId) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId), where('section', '==', 'practice'), where('itemId', '==', 'task5'));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

export async function markCodeChecked(studentId) {
  const q = query(collection(db, 'progress'), where('studentId', '==', studentId), where('section', '==', 'practice'), where('itemId', '==', 'task5'));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const ref = snap.docs[0].ref;
    await updateDoc(ref, { completed: true, checkedByTeacher: true });
  }
}

// ------------------ ПОЛЬЗОВАТЕЛЬ ------------------
export async function getUser(userId) {
  const docSnap = await getDoc(doc(db, 'users', userId));
  if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
  return null;
}