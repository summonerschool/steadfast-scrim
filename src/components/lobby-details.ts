import { EmbedBuilder } from '@discordjs/builders';
import { ProdraftURLs } from '../entities/external';
import { Scrim } from '../entities/scrim';
import { chance } from '../lib/chance';
import { scrimService } from '../services';

export const lobbyDetails = async (scrim: Scrim, recipientID: string, draftURLs: ProdraftURLs) => {
  const side = scrim.players.find((p) => p.userID === recipientID)?.side || 'BLUE';
  const teammates = await scrimService.getUserProfilesInScrim(scrim.id, side);

  const detailsText = `
      Lobby name: \`${chance.word({ length: 5 })}${chance.integer({ min: 10, max: 20 })}\`
      Password: \`${chance.integer({ min: 1000, max: 9999 })}\`
      [**Join draft**](${draftURLs[side].url})
      `;
  return new EmbedBuilder()
    .setColor(698371)
    .setTitle(`Summoner School Game #${scrim.id}`)
    .setDescription(`**Team ${draftURLs[side].name}**`)
    .addFields({ name: 'Lobby details', value: detailsText, inline: true })
    .addFields({ name: 'Teammates IGNs', value: teammates.map((p) => p.leagueIGN).join('\n'), inline: true });
};
