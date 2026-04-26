import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "scr-mesh-dev.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "scr-mesh-dev",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function makeAllUsersAdmin() {
  console.log("Searching for users to promote to Admin...");
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    if (usersSnap.empty) {
      console.log("⚠️ No users found in the database. Please visit http://localhost:3000/login and create an account first!");
      process.exit(0);
    }

    let promotedCount = 0;
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userRef = doc(db, "users", userDoc.id);
      
      await updateDoc(userRef, {
        role: "admin",
        // Give them access to all the demo facilities so the switcher & map works
        facilityIds: [
          "apex_manufacturing", 
          "city_gen_hosp", 
          "lincoln_high", 
          "grand_horizon", 
          "state_university"
        ],
      });
      console.log(`✅ Promoted user ${userData.email || userDoc.id} to ADMIN.`);
      promotedCount++;
    }
    
    console.log(`\n🎉 Successfully promoted ${promotedCount} user(s)!`);
    console.log("You can now go to http://localhost:3000 and it will route you to the Admin Dashboard.");
    setTimeout(() => process.exit(0), 2000);
  } catch (error) {
    console.error("Failed to promote users:", error);
    process.exit(1);
  }
}

makeAllUsersAdmin();
