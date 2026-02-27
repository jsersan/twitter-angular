# 🐦 Twitter Angular + Firebase

Clon de Twitter construido con **Angular 17** y **Firebase (Firestore + Auth)**.

---

## 📋 Características

| Feature | Descripción |
|---|---|
| 🔐 Autenticación | Registro y login con Firebase Auth |
| 🐦 Tweets | Publicar, dar like, responder en hilos |
| 👥 Seguimiento | Seguir / dejar de seguir usuarios |
| 🔍 Explorar | Búsqueda de usuarios en tiempo real |
| 👤 Perfil | Bio, avatar (DiceBear), estadísticas |
| 🛡️ Admin panel | Bloquear usuarios, eliminar hilos, cambiar roles |
| 📱 Responsive | Sidebar en desktop, navbar inferior en móvil |

---

## 🗄️ Estructura de Firestore

```
firestore/
├── users/{uid}
│   ├── uid, email, username, displayName
│   ├── bio, avatarUrl
│   ├── role: 'user' | 'admin'
│   ├── blocked: boolean
│   ├── followers[], following[]
│   ├── tweetsCount, followersCount, followingCount
│   └── createdAt
│
├── usernames/{username}
│   └── uid  (para unicidad de @username)
│
├── tweets/{tweetId}
│   ├── userId, username, displayName, avatarUrl
│   ├── content (max 280 chars)
│   ├── likes[]  (array de UIDs)
│   ├── replyTo  (tweetId padre, null si es original)
│   ├── deleted, deletedBy
│   └── createdAt
│
└── notifications/{notifId}
    ├── toUserId, fromUserId, fromUsername
    ├── type: 'like' | 'follow' | 'reply'
    ├── tweetId?, read
    └── createdAt
```

---

## 🚀 Instalación paso a paso

### 1. Crear proyecto Firebase

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com)
2. **"Crear proyecto"** → dale un nombre
3. Activar **Authentication**:
   - Authentication → Sign-in method → **Email/Password** → Activar
4. Crear **Firestore Database**:
   - Firestore Database → Crear base de datos → **Modo de producción**

### 2. Obtener credenciales

1. Firebase Console → ⚙️ Configuración del proyecto
2. Sección "Tus apps" → **Agregar app** → Web (</> icono)
3. Copiar el objeto `firebaseConfig`

### 3. Configurar el proyecto

Edita `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIza...",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
  }
};
```

### 4. Configurar reglas de seguridad

En Firebase Console → Firestore → **Rules**, pega el contenido de `firestore.rules`.

### 5. Crear índices de Firestore

Opción A (automático): Al ejecutar la app, Firestore te pedirá crear índices con un enlace directo.

Opción B (manual): Firebase Console → Firestore → **Indexes** → importa `firestore.indexes.json`.

### 6. Instalar y ejecutar

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
ng serve

# Abrir en navegador
http://localhost:4200
```

---

## 👑 Crear el primer Admin

El primer usuario admin debe crearse manualmente desde Firebase Console:

1. Regístrate normalmente en la app
2. Firebase Console → Firestore → `users` → busca tu documento
3. Edita el campo `role` → cambia `"user"` a `"admin"`

A partir de ahí, ese admin puede promover a otros usuarios desde el panel `/admin`.

---

## 🏗️ Estructura del proyecto

```
src/
├── app/
│   ├── components/
│   │   ├── navbar/          # Sidebar navegación
│   │   ├── login/           # Página de login
│   │   ├── register/        # Registro de usuarios
│   │   ├── home/            # Timeline + compositor de tweets
│   │   ├── profile/         # Perfil público + edición
│   │   ├── explore/         # Búsqueda de usuarios
│   │   ├── admin/           # Panel admin (protegido)
│   │   └── tweet-card/      # Componente de tweet reutilizable
│   ├── services/
│   │   ├── auth.service.ts  # Firebase Auth + perfil de usuario
│   │   ├── tweet.service.ts # CRUD tweets, likes, hilos
│   │   └── user.service.ts  # Follow/unfollow, búsqueda, admin ops
│   ├── guards/
│   │   ├── auth.guard.ts    # Protege rutas autenticadas
│   │   └── admin.guard.ts   # Protege rutas admin
│   ├── models/
│   │   └── models.ts        # Interfaces User, Tweet, Notification
│   ├── pipes/
│   │   └── time-ago.pipe.ts # "2h", "3d", etc.
│   ├── app.module.ts
│   └── app-routing.module.ts
└── environments/
    ├── environment.ts       # ← AQUÍ van tus credenciales Firebase
    └── environment.prod.ts
```

---

## 🛡️ Permisos por rol

| Acción | Usuario | Admin |
|---|:---:|:---:|
| Ver tweets | ✅ | ✅ |
| Publicar tweets | ✅ | ✅ |
| Dar like | ✅ | ✅ |
| Eliminar su propio tweet | ✅ | ✅ |
| Eliminar cualquier hilo | ❌ | ✅ |
| Ver panel admin | ❌ | ✅ |
| Bloquear usuarios | ❌ | ✅ |
| Cambiar roles | ❌ | ✅ |

---

## 📝 Notas técnicas

- **Límite de timeline**: Firestore `in` operator admite máx. 10 IDs. Si un usuario sigue a más de 9 personas, el timeline mostrará solo los primeros 9 + el propio usuario. Para escalabilidad real, se recomienda un **feed denormalizado** (duplicar tweets en una subcolección por seguidor).
- **Avatares**: Se usan avatares automáticos de [DiceBear](https://dicebear.com) basados en el username.
- **Búsqueda**: La búsqueda de usuarios usa rangos de Firestore. Para búsqueda full-text avanzada, integra **Algolia** o **Typesense**.
# tweeter-angular
