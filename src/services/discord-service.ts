import Discord, { ChannelType, Invite, Message, VoiceChannel } from 'discord.js';
import { User } from '../entities/user';

export interface DiscordService {
  sendMatchDirectMessage: (userIDs: string[], message: Discord.MessageOptions) => Promise<number>;
  createVoiceChannels: (guildID: string, teamNames: [string, string]) => Promise<[VoiceChannel, VoiceChannel]>;
  deleteVoiceChannels: (guildID: string, ids: string[]) => Promise<boolean>;
}

export const initDiscordService = (discordClient: Discord.Client) => {
  const service: DiscordService = {
    createVoiceChannels: async (guildID, teamNames) => {
      const guild = await discordClient.guilds.fetch({ guild: guildID });
      const channels = await Promise.all([
        guild.channels.create({
          type: ChannelType.GuildVoice,
          name: teamNames[0],
          userLimit: 5,
          parent: '826232163082698796'
        }),
        guild.channels.create({
          type: ChannelType.GuildVoice,
          name: teamNames[1],
          userLimit: 5,
          parent: '826232163082698796'
        })
      ]);

      return [channels[0], channels[1]];
    },
    sendMatchDirectMessage: async (userIDs: string[], message) => {
      const users = await Promise.all(userIDs.map((id) => discordClient.users.fetch(id)));
      const sent = await Promise.allSettled(users.map((u) => u.send(message)));
      return sent.filter((p) => p.status === 'fulfilled').length;
    },
    deleteVoiceChannels: async (guildID, ids) => {
      const guild = await discordClient.guilds.fetch({ guild: guildID });
      const channels = await Promise.all([
        guild.channels.fetch('826232163082698798'),
        guild.channels.fetch(ids[0]),
        guild.channels.fetch(ids[1])
      ]);

      const [lobby, blue, red] = channels.filter((vc): vc is VoiceChannel => vc != null);

      // Move users to lobby
      const movePromises = [...blue.members.values(), ...red.members.values()].map((m) => m.voice.setChannel(lobby));
      await Promise.all(movePromises);
      await Promise.all([blue.delete(), red.delete()]);
      return true;
    }
  };
  return service;
};
