const { BlobServiceClient } = require('@azure/storage-blob');
const keys = require('../config/keys');

// Ленивая инициализация клиента контейнера — подключение к Azure происходит
// один раз при первом реальном обращении, а не при старте сервера.
let containerClientPromise = null;

const getContainerClient = () => {
    if (!containerClientPromise) {
        containerClientPromise = (async () => {
            const blobServiceClient = BlobServiceClient.fromConnectionString(
                keys.azureStorage.connectionString
            );
            const containerClient = blobServiceClient.getContainerClient(
                keys.azureStorage.containerName
            );
            // access: 'blob' — анонимное чтение отдельного blob по прямой ссылке
            // (нужно, чтобы avatarUrl открывался напрямую в браузере/img src),
            // но листинг содержимого контейнера остаётся закрытым.
            await containerClient.createIfNotExists({ access: 'blob' });
            return containerClient;
        })().catch((err) => {
            containerClientPromise = null; // не кэшируем неудачную попытку — следующий вызов попробует снова
            throw err;
        });
    }
    return containerClientPromise;
};

// заливает буфер в Azure Blob Storage под именем blobName, возвращает публичный URL blob'а
exports.uploadBuffer = async (blobName, buffer, contentType) => {
    const containerClient = await getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType }
    });
    return blockBlobClient.url;
};

// принимает полный URL blob'а (то, что хранится в user.avatar/user.banner) и удаляет его из контейнера.
// Не критично, если blob'а уже нет — тогда deleteIfExists просто ничего не делает.
exports.deleteBlobByUrl = async (blobUrl) => {
    if (!blobUrl) return;
    const containerClient = await getContainerClient();

    let blobName;
    try {
        const parsed = new URL(blobUrl);
        // path вида /<containerName>/<blobName...> — убираем сегмент контейнера
        const segments = parsed.pathname.split('/').filter(Boolean);
        blobName = decodeURIComponent(segments.slice(1).join('/'));
    } catch {
        return; // не похоже на URL (например, старые локальные пути "avatars/xxx.png") — пропускаем
    }
    if (!blobName) return;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
};
