import { MessageActionRow, MessageButton } from 'discord.js';

export const ScrimResultActionRow = () =>
  new MessageActionRow().addComponents(
    new MessageButton().setCustomId('red-win').setLabel('Win').setStyle('PRIMARY'),
    new MessageButton().setCustomId('blue-win').setLabel('Win').setStyle('DANGER'),
    new MessageButton().setCustomId('remake').setLabel('Remake').setStyle('SECONDARY')
  );
