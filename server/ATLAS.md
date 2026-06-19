# Connect a free MongoDB Atlas database

Atlas is MongoDB's free cloud database — no local install, and your data
persists. Takes ~5 minutes.

## 1. Create an account & cluster
1. Go to **https://www.mongodb.com/atlas** and sign up (free).
2. **Build a Database** → choose the **M0 (Free)** tier → pick any cloud
   provider/region near you → **Create**.

## 2. Create a database user
1. Left sidebar → **Database Access** → **Add New Database User**.
2. Auth method **Password**. Set a username (e.g. `wavelength`) and a
   password. **Copy the password** — you'll need it.
3. Built-in role **Read and write to any database** → **Add User**.

## 3. Allow network access
1. Left sidebar → **Network Access** → **Add IP Address**.
2. For development, click **Allow Access from Anywhere** (`0.0.0.0/0`).
   *(For production, restrict this to your server's IP.)*
3. **Confirm**.

## 4. Get the connection string
1. Left sidebar → **Database** → **Connect** on your cluster.
2. Choose **Drivers** → driver **Node.js**.
3. Copy the string. It looks like:
   ```
   mongodb+srv://wavelength:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## 5. Put it in your `.env`
Edit [`server/.env`](.env):

```env
# Replace <db_password> with the password from step 2, and add the db name
# "wavelength" right before the "?" so your data lands in the right database.
MONGO_URI=mongodb+srv://wavelength:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/wavelength?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-string
```

> Tip: if your password has special characters (`@ : / ?`), URL-encode them
> (e.g. `@` → `%40`).

## 6. Run with the real database
```bash
cd server
npm run dev      # uses MONGO_URI from .env — data now persists
```

You should see `✅ Connected to MongoDB`. Verify end-to-end with `npm run smoke`
(it uses its own in-memory DB and won't touch your Atlas data).

---

`npm run dev:mem` (in-memory) is still there for quick throwaway demos —
use `npm run dev` once Atlas is configured.
