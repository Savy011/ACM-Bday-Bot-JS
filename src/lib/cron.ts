import type { Client } from "discord.js";

import { Bday } from "$models/bday.model";

export const executeBdays = (lastRunDate: string | null, client: Client<boolean>) => {
  return async () => {
    try {
      const rawServerTime = new Date();
      const istTimeString = rawServerTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const today = new Date(istTimeString);

      const currentMonthNum = today.getMonth() + 1;
      const currentDayNum = today.getDate();

      // BULLETPROOF DATE STRING: Manually format to "YYYY-MM-DD"
      // This prevents server locale changes from breaking your lock
      const currentDateString = `${today.getFullYear()}-${currentMonthNum}-${currentDayNum}`;

      if (lastRunDate === currentDateString) {
        console.log(`Cron prevented from duplicate run for date: ${currentDateString}. Skipping.`);
        return;
      }

      // Lock the cron for today
      lastRunDate = currentDateString;

      console.log(`\n=== CRON TRIGGERED ===`);
      console.log(`Locked for Date: ${currentDateString}`);
      console.log(`Translated IST Time: ${today.toString()}`);
      console.log(`======================\n`);

      const currentMonthPadded = String(currentMonthNum).padStart(2, "0");
      const currentMonthPlain = String(currentMonthNum);

      const daysToSearch = [
        currentDayNum,
        String(currentDayNum).padStart(2, "0"),
        String(currentDayNum),
      ];

      // Leap year logic for Feb 28th
      const isLeapYear =
        (today.getFullYear() % 4 === 0 && today.getFullYear() % 100 !== 0) ||
        today.getFullYear() % 400 === 0;
      if (!isLeapYear && currentMonthNum === 2 && currentDayNum === 28) {
        daysToSearch.push(29, "29");
      }

      const todayBdays = await Bday.find({
        month: { $in: [currentMonthNum, currentMonthPadded, currentMonthPlain] },
        day: { $in: daysToSearch },
      });

      if (todayBdays.length > 0) {
        try {
          const channel = await client.channels.fetch("1032522552804909114");
          if (channel) {
            // Extract unique user IDs using a Set to prevent duplicates if DB has multiple entries for one user
            const uniqueUserIds = [...new Set(todayBdays.map((user) => user.userId))];
            const wishArray = uniqueUserIds.map((id) => `<@${id}>`);

            let wishString = `🎂🎉 **Happy Birthday** ${wishArray.join(", ")}!`;

            if (wishString.length > 2000) {
              wishString = `🎂🎉 **Happy Birthday** to all our wonderful members celebrating today!`;
            }

            await channel.send(wishString);
            console.log(`Successfully wished ${uniqueUserIds.length} users.`);
          }
        } catch (discordError) {
          console.error("Discord Channel Fetch/Send Error:", discordError);
        }
      } else {
        console.log("No birthdays today.");
      }
    } catch (dbError) {
      console.error("Database Cron Error:", dbError);
    }
  };
};
