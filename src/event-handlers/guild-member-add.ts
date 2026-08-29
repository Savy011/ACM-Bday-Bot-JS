import type { GuildMember } from "discord.js";

import { buildEmbed } from "$lib/embeds";
import { Verify } from "$models/verify.model";

const guildMemberAdd = async (member: GuildMember) => {
  // 🛑 Ignore users joining other servers
  if (member.guild.id !== process.env.VERIFY_GUILD_ID) return;

  try {
    // Clear any old attempts and start fresh in the DB
    await Verify.findOneAndDelete({ userId: member.id });

    await Verify.create({
      userId: member.id,
      guildId: member.guild.id,
      step: "AWAITING_EMAIL",
    });

    // NEW: Restrict access immediately by giving them the unverified role
    if (process.env.UNVERIFIED_ROLE_ID) {
      await member.roles.add(process.env.UNVERIFIED_ROLE_ID).catch((err) => {
        console.error("Could not add unverified role:", err);
      });
    }

    await member.send({
      embeds: [
        buildEmbed({
          title: `Welcome to ${member.guild.name}!`,
          description:
            "To gain full access to the server, please verify your identity.\n\n**Reply to this message with your college email address** (e.g. `student@pec.edu.in`).",
          color: "INFO",
        }),
      ],
    });
  } catch (error) {
    console.error(`Failed to DM new member ${member.user.tag}. DMs might be disabled.`, error);
  }
};

export default guildMemberAdd;
