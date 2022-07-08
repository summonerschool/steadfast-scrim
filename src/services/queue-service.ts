

interface QueueService {
    joinQueue: (userID: string) => void
    leaveQueue: (userID: string) => void
}

const initQueueService = () => {
    const service: QueueService = {
        joinQueue: () => {

        },
    }
}
