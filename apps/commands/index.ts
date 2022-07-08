import "dotenv/config"
import axios from "axios"
import { SlashCommandBuilder } from "@discordjs/builders"

/* 
Includes all the available commands for the application. 
This should run during CI (GitHub actions) which updates the list of available commands IF this file changes.

*/


const APP_URL = `https://discord.com/api/v8/applications/${process.env.APP_ID}/guilds/${process.env.GUILD_ID}/commands`

const queueCmd = new SlashCommandBuilder()
	.setName("queue")
	.setDescription("Queue up for a high quality game of lego legends")
const leaveCmd = new SlashCommandBuilder().setName("leave").setDescription("Leave and touch grass")
const roleCmd = new SlashCommandBuilder()
	.setName("roles")
	.setDescription("Boast about your role")
	.addSubcommand((subcommand) =>
		subcommand
			.setName("add")
			.setDescription("Alters a user's roles")
			.addStringOption((option) =>
				option
					.setName("role")
					.setDescription("League of legends role")
					.addChoices(
						{ name: "Top", value: "TOP" },
						{ name: "Jungle", value: "JUNGLE" },
						{ name: "Mid", value: "MID" },
						{ name: "Adc", value: "ADC" },
						{ name: "Support", value: "SUPPORT" }
					)
					.setRequired(true)
			)
	)

const headers = {
	Authorization: `Bot ${process.env.BOT_TOKEN}`,
	"Content-Type": "application/json"
}

const data = [queueCmd, leaveCmd, roleCmd].map((cmd) => cmd.toJSON())

axios
	.put(APP_URL, JSON.stringify(data), {
		headers: headers
	})