/* Firebase 設定（這些值本來就會公開在網頁上，不是密碼；資料安全由 Firestore 安全規則把關） */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBf_LB4Eh8LDkimUMblrj37B0e4QYcWxtw",
  authDomain: "exam-review-15794.firebaseapp.com",
  projectId: "exam-review-15794",
  storageBucket: "exam-review-15794.firebasestorage.app",
  messagingSenderId: "83406179885",
  appId: "1:83406179885:web:1500ecfc85365bf57df2a4"
};

/* 學生只能用這個網域的學校帳號登入 */
window.SCHOOL_DOMAIN = "sssh.tp.edu.tw";

/* 老師帳號：可以登入老師後台。要新增老師，在這裡加 Email，並同步修改 Firestore 安全規則裡的名單 */
window.TEACHERS = ["contenttt0307@gmail.com", "0346@sssh.tp.edu.tw"];
