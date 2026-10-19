const admin = require('firebase-admin');
const axios = require('axios');

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (e) {
  console.error("Firebase Service Account JSON পার্স করতে সমস্যা হয়েছে!");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// ডিফল্ট সরকারি প্রধান জরুরি হটলাইন ডাটা
const emergencyServicesBD = [
  { name: "জাতীয় জরুরি সেবা", phone: "999", category: "emergency" },
  { name: "সরকারি তথ্য ও সেবা", phone: "333", category: "govt" },
  { name: "নারী ও শিশু নির্যাতন প্রতিরোধ সেল", phone: "109", category: "helpline" },
  { name: "দুদক হটলাইন", phone: "106", category: "govt" },
  { name: "দুর্যোগের আগাম বার্তা", phone: "1090", category: "disaster" },
  { name: "জাতীয় পরিচয়পত্র তথ্য", phone: "105", category: "govt" },
  { name: "শিশু সহায়তা ফোন", phone: "1098", category: "helpline" },
  { name: "স্বাস্থ্য বাতায়ন", phone: "16263", category: "health" }
];

async function updateEmergencyContacts() {
  try {
    console.log("ডাটা আপডেট শুরু হচ্ছে...");
    
    let contacts = [...emergencyServicesBD];

    // রিয়েলটাইম ওপেন ডাটা সোর্স চেষ্টা করা
    try {
      const response = await axios.get('https://raw.githubusercontent.com/nuralam365/bangladesh-emergency-hotline-json/main/hotlines.json', { timeout: 5000 });
      if (Array.isArray(response.data) && response.data.length > 0) {
        contacts = response.data;
      }
    } catch (apiError) {
      console.log("লাইভ এপিআই সাড়া দেয়নি, প্রস্তুতকৃত অফিশিয়াল হটলাইন ডাটা ব্যবহৃত হচ্ছে।");
    }

    const batch = db.batch();
    contacts.forEach(contact => {
      const docRef = db.collection('emergency_contacts').doc();
      batch.set(docRef, {
        name: contact.name,
        phone: contact.phone,
        category: contact.category || "govt",
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });

    await batch.commit();
    console.log(`সফলভাবে ${contacts.length} টি কন্টাক্ট ক্লাউড ডাটাবেসে সেভ করা হয়েছে!`);

  } catch (error) {
    console.error("ডাটা আপডেটে ত্রুটি:", error.message);
    process.exit(1);
  }
}

updateEmergencyContacts();
