import fsDriver from 'unstorage/drivers/fs'

// Каталог статистики читается при запуске сервера, а не при сборке:
// KEFLAB_STATS_DIR=/srv/keflab/shared/stats в окружении сервиса.
export default defineNitroPlugin(() => {
  useStorage().mount('stats', fsDriver({ base: process.env.KEFLAB_STATS_DIR ?? '.data/stats' }))
})
