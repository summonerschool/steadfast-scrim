import { CommandContext, SlashCommand, SlashCreator } from 'slash-create';
import { ProfileEmbed } from '../components/setup-feedback';
import { userService } from '../services';

class ProfileCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'profile',
      description: 'Show my profile'
    });

    this.filePath = __filename;
  }

  async run(ctx: CommandContext) {
    const user = await userService.getUserProfile(ctx.user.id);
    return { embeds: [ProfileEmbed(user)], ephemeral: true };
  }
}

export default ProfileCommand;
