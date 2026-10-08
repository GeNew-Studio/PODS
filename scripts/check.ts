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
    .sort((a, b) => b.result.score - a.result.score);
  const excluded = waiting.filter((recipient) => !organModule.evaluate(donor, recipient).eligible);
  ranked.slice(0, 3).forEach((item, index) => {
    console.log(
      `  ${index + 1}. ${item.recipient.name} ${item.result.score} urg ${item.result.urgencyPoints} ${item.result.steering ?? "no steering"}`,
    );
  });
  console.log(`  excluded ${excluded.length}: ${excluded.map((item) => item.name).join(", ")}`);
}
