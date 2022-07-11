import { MessageEmbed } from 'discord.js';
import { Player, Scrim } from '../entities/scrim';

const ROLES_ORDER = {
  TOP: 1,
  JUNGLE: 2,
  MID: 3,
  BOT: 4,
  SUPPORT: 5
};

const sortByRole = (p1: Player, p2: Player) => {
  return ROLES_ORDER[p1.role] - ROLES_ORDER[p2.role];
};
const teamToString = (player: Player) => `${player.role}: <@${player.userID}>`;

export const matchMessage = (scrim: Scrim) => {
  const red = scrim.players.filter((p) => p.team === 'RED').sort(sortByRole);
  const blue = scrim.players.filter((p) => p.team === 'BLUE').sort(sortByRole);

  return new MessageEmbed()
    .setColor('#698371')
    .setTitle(`Match ${scrim.id}`)
    .setDescription(
      `
    No autofilled players in this, feel free to swap roles among yourselves.\n
    MATCH ID: ${scrim.id}\n
    `
    )
    .addFields(
      { name: 'Team Blue', value: blue.join('\n'), inline: true },
      { name: 'Team Red', value: red.join('\n'), inline: true },
      { name: 'Regular field title', value: `Lobby creator: <@${scrim.lobbyCreatorID}>` }
    )
    .setTimestamp()
    .setFooter({ text: 'Anything wrong? spam the shit out of Tikka Masala' });
};
