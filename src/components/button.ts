import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const ScrimResultActionRow = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('red-win').setLabel('Win').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('blue-win').setLabel('Win').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('remake').setLabel('Remake').setStyle(ButtonStyle.Secondary)
  );
