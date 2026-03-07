# Guía: Configurar el Webhook de Wompi

**Para quién es esto:** Persona que administra la cuenta de Wompi del negocio.  
**Tiempo estimado:** 5 minutos.  
**¿Qué vas a hacer?** Decirle a Wompi a qué dirección debe avisar cuando alguien pague.

---

## Paso 1 — Ingresar al dashboard de Wompi

1. Abrir el navegador y entrar a: **https://comercios.wompi.co**
2. Iniciar sesión con:
   - **Correo:** _(el que usaste para crear la cuenta)_
   - **Contraseña:** _(tu contraseña)_

---

## Paso 2 — Ir a la sección de Webhooks

1. En el menú de la izquierda buscar **"Llaves y Webhooks"**  
   _(también puede aparecer como "Eventos" o "Developers")_
2. Hacer clic en esa opción.

---

## Paso 3 — Pegar la URL del webhook

Buscar el campo que dice **"URL de eventos"** o **"Webhook URL"** y escribir exactamente esto:

```
https://superluxurious-subpetrosal-debra.ngrok-free.dev/api/payments/webhook/dulce-momento
```

> ⚠️ **Importante:** Copiar y pegar completo, sin espacios al inicio ni al final.

---

## Paso 4 — Guardar

1. Hacer clic en el botón **Guardar** o **Actualizar**.
2. Wompi puede mostrar un mensaje de confirmación — es normal.

---

## ¿Cómo sé que funcionó?

Cuando un cliente pague el anticipo de un pedido, el sistema actualizará automáticamente el estado del pedido a **"Pagado"** sin que nadie tenga que hacerlo a mano.

---

## Datos adicionales (para el técnico)

| Campo | Valor |
|---|---|
| URL del webhook | `https://superluxurious-subpetrosal-debra.ngrok-free.dev/api/payments/webhook/dulce-momento` |
| Ambiente | Pruebas (sandbox) |
| Secreto de eventos | Ya configurado en el sistema |
| Secreto de integridad | Ya configurado en el sistema |

---

> **Nota:** Esta URL funciona mientras ngrok esté activo en la computadora del desarrollador.  
> En producción se cambiará por el dominio real del servidor.
