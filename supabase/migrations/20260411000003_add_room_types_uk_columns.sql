-- Add Ukrainian language columns to room_types
-- This allows bilingual content management from the admin panel

ALTER TABLE public.room_types
  ADD COLUMN IF NOT EXISTS name_uk TEXT,
  ADD COLUMN IF NOT EXISTS description_uk TEXT,
  ADD COLUMN IF NOT EXISTS short_description_uk TEXT,
  ADD COLUMN IF NOT EXISTS amenities_uk TEXT[] DEFAULT '{}';

-- Seed Ukrainian translations for existing rooms
UPDATE public.room_types SET
  name_uk             = 'Стандартний номер',
  short_description_uk = 'Затишний та добре обладнаний номер, ідеальний для короткого відпочинку або поїздки вихідного дня в Карпатах.',
  description_uk      = 'Комфортний та добре оснащений стандартний номер, що пропонує все необхідне для приємного перебування. Двоспальне ліжко, власна ванна кімната з душем, письмовий стіл та телевізор.',
  amenities_uk        = ARRAY['Безкоштовний WiFi', 'Телевізор', 'Власна ванна кімната', 'Письмовий стіл', 'Кондиціонер', 'Міні-холодильник', 'Сейф', 'Фен', 'Щоденне прибирання']
WHERE slug = 'standard-room';

UPDATE public.room_types SET
  name_uk             = 'Люкс Делюкс',
  short_description_uk = 'Елегантний комфорт із сучасними зручностями',
  description_uk      = 'Номер «Делюкс» пропонує ідеальне поєднання комфорту та елегантності. Сучасні зручності та продумані деталі створюють ідеальний куточок відпочинку після насиченого дня.',
  amenities_uk        = ARRAY['Безкоштовний WiFi', 'Кондиціонер', 'Міні-бар', 'Обслуговування номерів', 'Смарт-ТВ', 'Сейф']
WHERE slug = 'deluxe-room';

UPDATE public.room_types SET
  name_uk             = 'Представницький люкс',
  short_description_uk = 'Просторий люкс з окремою вітальнею',
  description_uk      = 'Представницький люкс створений для гостей, які цінують простір і розкіш. Окрема вітальня, преміальні меблі та ексклюзивні зручності забезпечують неперевершений рівень гостинності.',
  amenities_uk        = ARRAY['Безкоштовний WiFi', 'Кондиціонер', 'Міні-бар', 'Обслуговування номерів', 'Смарт-ТВ', 'Сейф', 'Вітальня', 'Письмовий стіл', 'Кавова машина']
WHERE slug = 'executive-suite';

UPDATE public.room_types SET
  name_uk             = 'Президентський люкс',
  short_description_uk = 'Найвища розкіш із панорамним краєвидом',
  description_uk      = 'Наш найрозкішніший номер — Президентський люкс — пропонує неперевершену елегантність та простір. Панорамний вид, приватна їдальня та послуги дворецького — втілення витонченої гостинності.',
  amenities_uk        = ARRAY['Безкоштовний WiFi', 'Кондиціонер', 'Міні-бар', 'Обслуговування номерів', 'Смарт-ТВ', 'Сейф', 'Вітальня', 'Приватна їдальня', 'Дворецький', 'Джакузі', 'Панорамний вид']
WHERE slug = 'presidential-suite';

UPDATE public.room_types SET
  name_uk             = 'Сімейний номер',
  short_description_uk = 'Просторе розміщення для сімей',
  description_uk      = 'Ідеальний варіант для сімей — просторий номер з комфортними ліжками для чотирьох гостей, сімейними зручностями та додатковим простором для відпочинку.',
  amenities_uk        = ARRAY['Безкоштовний WiFi', 'Кондиціонер', 'Міні-бар', 'Обслуговування номерів', 'Смарт-ТВ', 'Сейф', 'Додаткові ліжка']
WHERE slug = 'family-room';
