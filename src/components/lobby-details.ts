import { MessageEmbed } from 'discord.js';
import { Scrim } from '../entities/scrim';
import { chance } from '../lib/chance';
import { scrimService } from '../services';

export const lobbyDetails = async (scrim: Scrim, recipientID: string) => {
  const side = scrim.players.find(p => p.userID === recipientID)?.side || "BLUE"
  const teammates = await scrimService.getUserProfilesInScrim(scrim.id, side)
  return new MessageEmbed()
    .setColor('#698371')
    .setTitle(`Lobby Details #${scrim.id}`)
    .setDescription(
      `
      Lobby name: \`${chance.word({length: 5})}${chance.integer({min: 10, max: 20})}\`
      Password: ${chance.integer({min: 1000, max: 9999})}
      `
      
    ).addFields(
      { name: 'Teammates IGNs', value: teammates.map(p => p.leagueIGN).join("\n"), inline: true },
    )
};
