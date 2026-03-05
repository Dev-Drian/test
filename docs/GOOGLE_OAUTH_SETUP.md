# Guía de Configuración: Google OAuth para Calendar y Sheets

Esta guía te ayudará a configurar las credenciales necesarias para integrar Google Calendar y Google Sheets en tu aplicación.

## Paso 1: Crear un Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Haz clic en el selector de proyectos (arriba a la izquierda)
3. Crea un nuevo proyecto:
   - Nombre: `MiApp Integrations` (o el nombre que prefieras)
   - Haz clic en **Crear**

## Paso 2: Habilitar las APIs necesarias

1. En el menú lateral, ve a **APIs y servicios** > **Biblioteca**
2. Busca y habilita estas APIs:
   - **Google Calendar API**
   - **Google Sheets API**
   - **Google Drive API** (necesaria para listar hojas)

Para cada una:
- Haz clic en la API
- Clic en **Habilitar**

## Paso 3: Configurar la Pantalla de Consentimiento OAuth

1. Ve a **APIs y servicios** > **Pantalla de consentimiento OAuth**
2. Selecciona **Externo** (a menos que tengas Google Workspace)
3. Completa el formulario:
   - **Nombre de la aplicación**: Tu nombre de app
   - **Email de soporte**: Tu email
   - **Contactos del desarrollador**: Tu email
4. En **Scopes**, añade:
   - `.../auth/calendar`
   - `.../auth/calendar.events`
   - `.../auth/spreadsheets`
   - `.../auth/drive.readonly`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. En **Usuarios de prueba**, añade los emails de los usuarios que probarán la integración

## Paso 4: Crear Credenciales OAuth 2.0

1. Ve a **APIs y servicios** > **Credenciales**
2. Clic en **+ Crear credenciales** > **ID de cliente de OAuth**
3. Configura:
   - **Tipo de aplicación**: Aplicación web
   - **Nombre**: `MiApp OAuth Client`
   - **Orígenes de JavaScript autorizados**:
     ```
     http://localhost:3000
     http://localhost:5173
     https://tudominio.com
     ```
   - **URIs de redireccionamiento autorizados**:
     ```
     http://localhost:3001/api/integrations/google/callback
     https://tuapi.com/api/integrations/google/callback
     ```
4. Haz clic en **Crear**
5. **Guarda** el **Client ID** y **Client Secret** que aparecen

## Paso 5: Configurar Variables de Entorno

Añade estas variables a tu archivo `.env` del backend:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:3001/api/integrations/google/callback

# En producción, usa tu dominio real:
# GOOGLE_REDIRECT_URI=https://tuapi.com/api/integrations/google/callback
```

## Paso 6: Reiniciar el Servidor

Después de configurar las variables de entorno:

```bash
cd backend
npm run dev
```

## Verificar la Configuración

1. Inicia sesión en tu aplicación
2. Ve a la sección de Integraciones
3. Haz clic en **Conectar con Google**
4. Deberías ver la pantalla de consentimiento de Google
5. Autoriza los permisos
6. Serás redirigido de vuelta a la aplicación con la cuenta conectada

## Solución de Problemas

### Error: "Google OAuth no está configurado"
- Verifica que las variables de entorno estén configuradas correctamente
- Reinicia el servidor después de cambiar el `.env`

### Error: "redirect_uri_mismatch"
- El URI de redirección debe coincidir EXACTAMENTE con el configurado en Google Cloud
- Incluye el protocolo (http/https) y el puerto si aplica

### Error: "Access blocked: Authorization Error"
- En modo de prueba, solo los usuarios añadidos como "Usuarios de prueba" pueden conectarse
- Para publicar la app, necesitas verificación de Google

### Error: "invalid_grant"
- El código de autorización ha expirado (válido solo 10 minutos)
- Intenta conectar de nuevo

## Notas de Seguridad

- **Nunca** compartas tu Client Secret
- **Nunca** subas el `.env` a control de versiones
- En producción, usa **HTTPS** obligatoriamente
- Considera solicitar la verificación de Google para uso público

## Límites y Cuotas

- **Google Calendar API**: 1,000,000 solicitudes/día gratis
- **Google Sheets API**: 300 solicitudes/minuto por usuario
- **Google Drive API**: 20,000 solicitudes/100 segundos

Para más información, consulta la [documentación oficial de Google](https://developers.google.com/identity/protocols/oauth2).
