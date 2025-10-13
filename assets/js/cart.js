rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ==============================
    // USERS COLLECTION
    // ==============================
    match /users/{userId} {
      allow create: if request.auth != null
                    && request.auth.uid == userId;
      allow read, update, delete: if request.auth != null
                                  && request.auth.uid == userId;
    }

    // ==============================
    // PRODUCTS COLLECTION
    // ==============================
    match /products/{productId} {
      allow read: if true; // everyone can view
      allow create, update, delete: if request.auth != null
                                    && request.auth.token.admin == true;
    }

    // ==============================
    // ORDERS COLLECTION
    // ==============================
    match /orders/{orderId} {
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.userId;
      allow read, update, delete: if request.auth != null
                                  && resource.data.userId == request.auth.uid;
      allow read, update: if request.auth != null
                          && request.auth.token.admin == true;
    }

    // ==============================
    // REVIEWS SUBCOLLECTION
    // ==============================
    match /products/{productId}/reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null
                            && request.auth.uid == resource.data.userId;
    }

    // Deny all other writes
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
