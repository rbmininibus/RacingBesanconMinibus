# Réservation Minibus RB

Application Next.js pour réserver les 3 minibus du Racing Besançon.

## Variables Vercel nécessaires

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- ADMIN_EMAIL=loris.rosain@gmail.com
- MAIL_FROM=Réservation Minibus RB <onboarding@resend.dev>

## Installation locale

```bash
npm install
npm run dev
```

## Déploiement

1. Envoyer ce dossier sur GitHub.
2. Importer le repo dans Vercel.
3. Ajouter les variables d’environnement.
4. Déployer.

## Important

Dans le formulaire, les véhicules utilisent des valeurs MINIBUS_1, MINIBUS_2, MINIBUS_3 par défaut. Si votre table `vehicles.id` contient des UUID, remplacez ces valeurs dans `app/page.tsx` par les vrais IDs de Supabase, ou adaptez la table pour utiliser des IDs textuels.
