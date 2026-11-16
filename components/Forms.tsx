"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { BLOOD_TYPES, CLUSTERS, MEDICINES, PERFUSION_DEVICES } from "@/lib/constants";
import { bmi } from "@/lib/format";
import { listOrgans } from "@/lib/organs/registry";
import type { ActionState, Donor, FieldDef, OrganId, Profile, Recipient } from "@/lib/types";

const input = "mt-1 w-full rounded border border-[#d5e0de] bg-white px-2 py-1.5 text-sm";
const organs = listOrgans();

type DonorAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

// Submits through onSubmit instead of the form action prop. React clears a form after an
// action-prop submit, which reset the controlled Organ select to Heart after a validation error.
function useSaveAction(action: DonorAction) {
  const router = useRouter();
  const [state, dispatch, pending] = useActionState(async (state: ActionState, formData: FormData) => {
    const result = await action(state, formData);
    if (result?.redirectTo) router.push(result.redirectTo);
    return result;
  }, null);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return [state, onSubmit, pending] as const;
}

export function DonorForm({ action, donor }: { action: DonorAction; donor?: Donor }) {
  const [organ, setOrgan] = useState<OrganId>(donor?.organ ?? "heart");
  const [state, onSubmit, pending] = useSaveAction(action);
  const organModule = organs.find((item) => item.id === organ) ?? organs[0];
  const profile = donor?.organ === organ ? donor.profile : organModule.donorDefaults;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {donor ? <input type="hidden" name="id" value={donor.id} /> : null}
      {state?.error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      <Section title="Identity">
        <Label text="Organ">
          <select name="organ" className={input} value={organ} onChange={(event) => setOrgan(event.target.value as OrganId)}>
            {organs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Name">
          <input name="name" required defaultValue={donor?.name ?? ""} className={input} />
        </Label>
        <Label text="Sex">
          <select name="sex" defaultValue={donor?.sex ?? "male"} className={input}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Label>
        <Label text="Blood group">
          <select name="bloodType" defaultValue={donor?.bloodType ?? "O"} className={input}>
            {BLOOD_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Label>
      </Section>
      <Section title="Clinical background">
        <Label text="HLA antigens" help="Comma-separated, for example A2, B44, DR4.">
          <input name="hla" defaultValue={donor?.hlaAntigens.join(", ") ?? ""} className={input} />
        </Label>
        <Check name="hlaComplete" label="HLA typing is complete" defaultChecked={donor?.hlaComplete ?? true} />
        <Label text="Cause of death">
          <input name="causeOfDeath" required defaultValue={donor?.causeOfDeath ?? ""} className={input} />
        </Label>
        <Label text="Medicines" help="Routine medicines are recorded and do not change the score by themselves.">
          <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
            {MEDICINES.map((item) => (
              <label key={item} className="flex items-center gap-2">
                <input type="checkbox" name="medicines" value={item} defaultChecked={donor?.medicines.includes(item)} />
                {item}
              </label>
            ))}
          </div>
        </Label>
      </Section>
      <Section title="Demographics and history">
        <Label text="Age">
          <input name="age" type="number" min={0} max={110} required defaultValue={donor?.age ?? 40} className={input} />
        </Label>
        <Label text="Height (cm)">
          <input name="heightCm" type="number" min={80} max={230} required defaultValue={donor?.heightCm ?? 170} className={input} />
        </Label>
        <Label text="Weight (kg)">
          <input name="weightKg" type="number" min={20} max={250} required defaultValue={donor?.weightKg ?? 70} className={input} />
        </Label>
        <p className="text-sm text-[#5c6f6d] sm:self-end">
          BMI is calculated. Current sample {bmi(donor?.heightCm ?? 170, donor?.weightKg ?? 70)}.
        </p>
        <Label text="Alcohol">
          <select name="alcohol" defaultValue={donor?.alcohol ?? "none"} className={input}>
            <option value="none">None</option>
            <option value="social">Social</option>
            <option value="heavy">Heavy</option>
          </select>
        </Label>
      </Section>
      <Section title="Logistics">
        <Label text="Donor hospital">
          <input name="hospital" required defaultValue={donor?.hospital ?? ""} className={input} />
        </Label>
        <Label text="Cluster">
          <select name="cluster" defaultValue={donor?.cluster ?? "Hong Kong West"} className={input}>
            {CLUSTERS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Label>
        <Label text="Cold ischaemic time (hours)">
          <input
            name="coldIschaemicHours"
            type="number"
            min={0}
            max={48}
            step={0.1}
            required
            defaultValue={donor?.coldIschaemicHours ?? 2}
            className={input}
          />
        </Label>
        <Label text="Warm ischaemic time (minutes)" help="Stored for a later kidney or liver module. It does not change the heart or lung score.">
          <input
            name="warmIschaemicMinutes"
            type="number"
            min={0}
            max={300}
            step={1}
            required
            defaultValue={donor?.warmIschaemicMinutes ?? 0}
            className={input}
          />
        </Label>
        <Label text="Perfusion">
          <select name="perfusionDevice" defaultValue={donor?.perfusionDevice ?? "none"} className={input}>
            {PERFUSION_DEVICES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Expected operative time (hours)">
          <input
            name="expectedOperativeHours"
            type="number"
            min={0}
            max={24}
            step={0.1}
            required
            defaultValue={donor?.expectedOperativeHours ?? 3}
            className={input}
          />
        </Label>
        <p className="text-sm text-[#5c6f6d] sm:col-span-2">
          Hearts are implanted at Queen Mary Hospital. Listing and assessment are at Grantham Hospital.
        </p>
      </Section>
      <Section title={`${organModule.label} details`}>
        <div key={organ} className="contents">
          {organModule.donorFields.map((field) => (
            <ProfileField key={field.key} field={field} value={profile[field.key]} />
          ))}
        </div>
      </Section>
      <Section title="Safety flags">
        <Check name="brainDead" label="Certified brain dead" defaultChecked={donor?.brainDead ?? true} />
        <Check name="familyConsent" label="Family consent recorded" defaultChecked={donor?.familyConsent ?? true} />
        <Check name="circulatoryDeath" label="Donation after circulatory death" defaultChecked={donor?.circulatoryDeath ?? false} />
        <Check name="hiv" label="Active HIV" defaultChecked={donor?.hiv ?? false} />
        <Check name="cjd" label="CJD" defaultChecked={donor?.cjd ?? false} />
        <Check name="uncontrolledSepsis" label="Uncontrolled sepsis" defaultChecked={donor?.uncontrolledSepsis ?? false} />
        <Check name="metastaticCancer" label="Metastatic or non-curable cancer" defaultChecked={donor?.metastaticCancer ?? false} />
        <Check name="lymphNodeMetastasis" label="Lymph-node metastasis" defaultChecked={donor?.lymphNodeMetastasis ?? false} />
        <Check name="melanomaHistory" label="History of melanoma" defaultChecked={donor?.melanomaHistory ?? false} />
        <Check name="choriocarcinomaHistory" label="History of choriocarcinoma" defaultChecked={donor?.choriocarcinomaHistory ?? false} />
        <Check name="primaryBrainTumour" label="Primary brain tumour (does not exclude by itself)" defaultChecked={donor?.primaryBrainTumour ?? false} />
        <Check name="hepatitisCarrier" label="Hepatitis carrier (risk flag, not an automatic exclusion)" defaultChecked={donor?.hepatitisCarrier ?? false} />
        <Check name="highDoseSteroids" label="Long-term high-dose steroids" defaultChecked={donor?.highDoseSteroids ?? false} />
      </Section>
      <button disabled={pending} className="rounded bg-[#0c6b66] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save donor"}
      </button>
    </form>
  );
}

export function RecipientForm({ action, recipient }: { action: DonorAction; recipient?: Recipient }) {
  const [organ, setOrgan] = useState<OrganId>(recipient?.organ ?? "heart");
  const [state, onSubmit, pending] = useSaveAction(action);
  const organModule = organs.find((item) => item.id === organ) ?? organs[0];
  const profile = recipient?.organ === organ ? recipient.profile : organModule.recipientDefaults;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {recipient ? <input type="hidden" name="id" value={recipient.id} /> : null}
      {state?.error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      <Section title="Identity">
        <Label text="Organ">
          <select name="organ" className={input} value={organ} onChange={(event) => setOrgan(event.target.value as OrganId)}>
            {organs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Name">
          <input name="name" required defaultValue={recipient?.name ?? ""} className={input} />
        </Label>
        <Label text="Sex">
          <select name="sex" defaultValue={recipient?.sex ?? "male"} className={input}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Label>
        <Label text="Blood group">
          <select name="bloodType" defaultValue={recipient?.bloodType ?? "O"} className={input}>
            {BLOOD_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Label>
        <Check name="active" label="Active on the waiting list" defaultChecked={recipient?.active ?? true} />
      </Section>
      <Section title="Clinical background">
        <Label text="HLA antigens">
          <input name="hla" defaultValue={recipient?.hlaAntigens.join(", ") ?? ""} className={input} />
        </Label>
        <Label text="Unacceptable antigens" help="A predicted positive crossmatch excludes the patient.">
          <input name="unacceptable" defaultValue={recipient?.unacceptableAntigens.join(", ") ?? ""} className={input} />
        </Label>
        <Check name="hlaComplete" label="HLA typing and antibody screen are complete" defaultChecked={recipient?.hlaComplete ?? true} />
        <Label text="cPRA">
          <input name="cpra" type="number" min={0} max={100} required defaultValue={recipient?.cpra ?? 0} className={input} />
        </Label>
        <Label text="Cancer status">
          <select name="cancerStatus" defaultValue={recipient?.cancerStatus ?? "none"} className={input}>
            <option value="none">None</option>
            <option value="remission">Remission</option>
            <option value="active">Active extra-thoracic cancer</option>
          </select>
        </Label>
        <Label text="Relevant clinical background">
          <textarea name="clinicalBackground" required defaultValue={recipient?.clinicalBackground ?? ""} className={`${input} min-h-20`} />
        </Label>
        <Label text="Functional status">
          <select name="functionalStatus" defaultValue={recipient?.functionalStatus ?? "good"} className={input}>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </Label>
        <Check name="kidneyDisease" label="Kidney disease" defaultChecked={recipient?.kidneyDisease ?? false} />
        <Check name="liverDisease" label="Liver disease" defaultChecked={recipient?.liverDisease ?? false} />
      </Section>
      <Section title="Demographics and urgency">
        <Label text="Age">
          <input name="age" type="number" required min={0} max={110} defaultValue={recipient?.age ?? 45} className={input} />
        </Label>
        <Label text="Height (cm)">
          <input name="heightCm" type="number" required min={80} max={230} defaultValue={recipient?.heightCm ?? 170} className={input} />
        </Label>
        <Label text="Weight (kg)">
          <input name="weightKg" type="number" required min={20} max={250} defaultValue={recipient?.weightKg ?? 70} className={input} />
        </Label>
        <Label text="Days on the waiting list">
          <input name="daysWaiting" type="number" required min={0} max={5000} defaultValue={recipient?.daysWaiting ?? 0} className={input} />
        </Label>
        <Label text="Listing hospital">
          <input name="hospital" defaultValue={recipient?.hospital ?? "Grantham Hospital"} className={input} />
        </Label>
        <Label text="Cluster">
          <select name="cluster" defaultValue={recipient?.cluster ?? "Hong Kong West"} className={input}>
            {CLUSTERS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Label>
      </Section>
      <Section title={`${organModule.label} details`}>
        <div key={organ} className="contents">
          {organModule.recipientFields.map((field) => (
            <ProfileField key={field.key} field={field} value={profile[field.key]} />
          ))}
        </div>
      </Section>
      <button disabled={pending} className="rounded bg-[#0c6b66] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save patient"}
      </button>
    </form>
  );
}

function ProfileField({ field, value }: { field: FieldDef; value: Profile[string] | undefined }) {
  if (field.type === "boolean") {
    return <Check name={`p_${field.key}`} label={field.label} help={field.help} defaultChecked={value === true} />;
  }
  if (field.type === "select") {
    return (
      <Label text={field.label} help={field.help}>
        <select name={`p_${field.key}`} defaultValue={String(value ?? field.options?.[0]?.value ?? "")} className={input}>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Label>
    );
  }
  return (
    <Label text={field.unit ? `${field.label} (${field.unit})` : field.label} help={field.help}>
      <input
        name={`p_${field.key}`}
        type={field.type === "number" ? "number" : "text"}
        min={field.min}
        max={field.max}
        step={field.step}
        defaultValue={value == null ? "" : String(value)}
        className={input}
      />
    </Label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-[#d5e0de] bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#0c6b66]">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Label({ text, help, children }: { text: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-[#143331]">{text}</span>
      {help ? <span className="mt-0.5 block text-xs text-[#5c6f6d]">{help}</span> : null}
      {children}
    </label>
  );
}

function Check({
  name,
  label,
  help,
  defaultChecked,
}: {
  name: string;
  label: string;
  help?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm sm:col-span-1">
      <input type="checkbox" name={name} value="yes" defaultChecked={defaultChecked} className="mt-1" />
      <span>
        {label}
        {help ? <span className="block text-xs text-[#5c6f6d]">{help}</span> : null}
      </span>
    </label>
  );
}
