import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  convertInchesToTwip,
} from "docx";
import type { GuestForm, Reservation } from "./supabase-types";

// A4 usable width in twips: 11906 twip page − 1440 left − 1440 right = 9026 twip
const PAGE_WIDTH_TWIP = 9026;
const COL1 = Math.round(PAGE_WIDTH_TWIP * 0.38);
const COL2 = PAGE_WIDTH_TWIP - COL1;

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  } catch {
    return dateStr;
  }
}

function val(v: string | null | undefined): string {
  return v?.trim() || "—";
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } as const;
const CELL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function makeRow(label: string, value: string, shaded = false): TableRow {
  const shading = shaded ? { type: ShadingType.SOLID, color: "F5F5F5", fill: "F5F5F5" } : undefined;
  return new TableRow({
    children: [
      new TableCell({
        width: { size: COL1, type: WidthType.DXA },
        borders: CELL_BORDERS,
        shading,
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: label, bold: true, size: 20, font: "Calibri" })],
          }),
        ],
      }),
      new TableCell({
        width: { size: COL2, type: WidthType.DXA },
        borders: CELL_BORDERS,
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: value, size: 20, font: "Calibri" })],
          }),
        ],
      }),
    ],
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Calibri", color: "333333" })],
  });
}

function guestTable(form: GuestForm, index: number): Array<Paragraph | Table> {
  const rows: TableRow[] = [];
  const addRow = (label: string, value: string, i: number) =>
    rows.push(makeRow(label, value, i % 2 === 0));

  addRow("Повне ім'я / Full Name",              val(form.full_name),               0);
  addRow("Дата народження / Date of Birth",     formatDate(form.date_of_birth),    1);
  addRow("Країна / Country",                    val(form.country_of_residence),    2);
  addRow("Область / Region",                    val(form.region),                  3);
  addRow("Район / District",                    val(form.district),                4);
  addRow("Місто/село / Village-City",           val(form.village_city),            5);
  addRow("Вулиця, будинок, кв. / Street, House, Apt", val(form.street_house_apartment), 6);
  addRow("Серія паспорта / Passport Series",   val(form.passport_series),         7);
  addRow("Ким виданий / Issued By",             val(form.issued_by),               8);

  let i = 9;
  if (form.ubk) { addRow("УБК / UBK", val(form.ubk), i++); }
  addRow("Телефон / Phone", val(form.phone_number), i++);
  if (form.vehicle_number) { addRow("Номер авто / Vehicle №", val(form.vehicle_number), i++); }

  return [
    new Table({
      width: { size: PAGE_WIDTH_TWIP, type: WidthType.DXA },
      rows,
    }),
    new Paragraph({ text: "" }),
  ];
}

export async function exportGuestFormDocx(
  forms: GuestForm[],
  reservation: Reservation
): Promise<void> {
  const children: Array<Paragraph | Table> = [];

  // ── Title ─────────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
      children: [
        new TextRun({
          text: "Форма заїзду гостя / Guest Check-in Form",
          bold: true,
          size: 32,
          font: "Calibri",
          color: "222222",
        }),
      ],
    })
  );

  // ── Reservation info ──────────────────────────────────────────────────────
  children.push(sectionHeading("Інформація про бронювання / Reservation Info"));
  children.push(
    new Table({
      width: { size: PAGE_WIDTH_TWIP, type: WidthType.DXA },
      rows: [
        makeRow("Гість / Guest",             val(reservation.guest_name),    false),
        makeRow("Заїзд / Check-in",          formatDate(reservation.check_in_date), true),
        makeRow("Виїзд / Check-out",         formatDate(reservation.check_out_date), false),
        makeRow("К-сть гостей / Guests",     String(reservation.num_guests), true),
        makeRow("Сума / Total",              `${reservation.total_price} UAH`, false),
      ],
    })
  );
  children.push(new Paragraph({ text: "" }));

  // ── Guest sections ────────────────────────────────────────────────────────
  for (let i = 0; i < forms.length; i++) {
    const heading = forms.length > 1
      ? `Гість ${i + 1} / Guest ${i + 1}`
      : "Дані гостя / Guest Data";
    children.push(sectionHeading(heading));
    children.push(...guestTable(forms[i], i));
  }

  // ── Signature line ────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      spacing: { before: 480 },
      children: [
        new TextRun({ text: "Підпис / Signature: _______________________", size: 18, font: "Calibri", color: "555555" }),
      ],
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left:   convertInchesToTwip(1),
              right:  convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `checkin-${reservation.guest_name.replace(/\s+/g, "_")}-${reservation.check_in_date}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
