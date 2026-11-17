import { sampleDonors, sampleRecipients } from "../lib/seed";
import { getOrgan } from "../lib/organs/registry";

const donors = sampleDonors();
const recipients = sampleRecipients();

for (const donor of donors) {
  const organModule = getOrgan(donor.organ);
  const quality = organModule.quality(donor);
  const waiting = recipients.filter((item) => item.organ === donor.organ && item.active);
  const blocked = organModule.donorBlock(donor);
  console.log(`\n${donor.id} ${donor.name} quality ${quality.value} block ${blocked.length}`);
  if (blocked.length) {
    blocked.forEach((reason) => console.log(`  BLOCK ${reason}`));
    continue;
  }
  const ranked = waiting
    .map((recipient) => ({ recipient, result: organModule.evaluate(donor, recipient) }))
    .filter((item) => item.result.eligible)
    .sort(
      (a, b) =>
        a.result.tier - b.result.tier ||
        a.result.bgPriority - b.result.bgPriority ||
        b.result.sortKey - a.result.sortKey ||
        b.result.score - a.result.score,
    );
  const excluded = waiting.filter((recipient) => !organModule.evaluate(donor, recipient).eligible);
  ranked.forEach((item, index) => {
    console.log(
      `  ${index + 1}. [${item.result.tierLabel || "-"} bg${item.result.bgPriority}] ${item.recipient.name} ${item.recipient.bloodType} score ${item.result.score} ${item.result.urgencyLabel} ${item.result.steering ? "STEERED" : ""}`,
    );
  });
  for (const recipient of excluded) {
    console.log(`  x ${recipient.name}: ${organModule.evaluate(donor, recipient).reasons.join(" | ")}`);
  }
}
