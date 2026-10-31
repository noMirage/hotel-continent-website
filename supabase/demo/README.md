# Демо-версія адмінки

Окрема копія сайту з окремою базою Supabase, заповненою вигаданими даними.
Код той самий, відрізняються лише змінні середовища у Vercel.

```
Production:  <prod>.vercel.app          →  Supabase (реальні дані)
Demo:        continent-demo.vercel.app  →  Supabase continent-demo (фейкові дані)
```

## 1. Supabase (окремий акаунт)

1. Зареєструвати новий акаунт на supabase.com → **New project** `continent-demo`
   (регіон: Central EU / Frankfurt). Зберегти пароль бази.
2. **Authentication → Sign In / Providers** → вимкнути *Allow new users to sign up*.
   (Інакше будь-хто зможе зареєструватися через API, а нічне скидання зупиниться — див. захист нижче.)
3. **Connect** → *Session pooler* → скопіювати connection string.

## 2. Схема бази (міграції)

З кореня репозиторію (без `supabase link`, щоб не перелінкувати прод):

```bash
npx supabase db push --db-url "postgresql://postgres.<ref>:<PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

> Не вставляйте міграції одним скриптом у SQL Editor: `ALTER TYPE ... ADD VALUE`
> не можна використовувати в тій самій транзакції, тому їх треба застосовувати по файлах.

## 3. Демо-дані

SQL Editor демо-проєкту → вставити весь `supabase/demo/seed-demo.sql` → **Run**.
Результат: `Demo data ready: … room bookings, … banquets, …`.

Повторне заповнення будь-коли: `SELECT demo.reseed();`

Скрипт сам відмовиться працювати, якщо в `auth.users` є хоч один акаунт не з `@example.com`,
тож випадково запустити його на проді не вийде.

### Акаунти (пароль для всіх: `Demo2026!`)

| Email                | Роль        | Ім'я               |
|----------------------|-------------|--------------------|
| `owner@example.com`  | owner       | Михайло Власенко   |
| `admin@example.com`  | super_admin | Наталія Гриценко   |
| `olena@example.com`  | admin       | Олена Коваль       |
| `andrii@example.com` | admin       | Андрій Мельник     |
| `viewer@example.com` | viewer      | Ірина Бондар       |

### Що генерується

- 18 номерів у 5 категоріях, ціни в UAH (з цінами за кількість гостей), статуси прибирання, один номер на ремонті
- приблизно 6 місяців історії та 2,5 місяця майбутніх бронювань з усіма статусами, джерелами (сайт/адмін), депозитами, оплатами, туристичним збором, акціями
- 4 групові бронювання (минуле, поточне, підтверджене, очікує) з розселенням по номерах
- бронювання на кілька номерів (`booking_group_id`)
- анкети гостей для поточних заїздів
- 8 банкетів у всіх колонках канбану
- 3 акції, заявки на акції та групові заявки з сайту

Усі дати рахуються від «сьогодні» (Київ), тому після `reseed()` демо завжди виглядає актуально.

### Нічне скидання (опційно)

Database → Extensions → увімкнути `pg_cron`, потім у SQL Editor:

```sql
SELECT cron.schedule('demo-nightly-reset', '0 1 * * *', 'SELECT demo.reseed()');
```

## 4. Vercel

**Add New → Project** → імпортувати цей самий Git-репозиторій → назва `continent-demo`.
Framework визначиться як Vite. У **Environment Variables** указати дані **демо**-проєкту
(Supabase → Project Settings → API):

| Змінна                          | Значення                     |
|---------------------------------|------------------------------|
| `VITE_SUPABASE_URL`             | `https://<demo-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon / publishable key       |
| `VITE_SUPABASE_PROJECT_ID`      | `<demo-ref>`                 |

→ **Deploy**. Production URL демо-проєкту публічний, Deployment Protection на нього не діє.
Кожен push у `main` оновлюватиме і прод, і демо.

Наостанок: Supabase → Authentication → URL Configuration → *Site URL* = URL демо.

## Важливо

- Безкоштовний проєкт Supabase **засинає після 7 днів без активності**. Перед показом
  зайдіть у дашборд і за потреби натисніть *Restore*.
- Після змін у схемі (нові міграції) застосуйте їх і до демо (`db push --db-url …`)
  та за потреби доповніть `seed-demo.sql`.
