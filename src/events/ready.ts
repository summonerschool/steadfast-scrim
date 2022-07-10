import { client } from '../index';

class Ready {
  name: string = 'ready';

  async execute(client: any) {
    console.log(`Ready! Logged in as ${client}`);

    return 'test';
  }
}

export default Ready;
