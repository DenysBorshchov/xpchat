// XPchat Pro - Менеджер файлов
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

class FileManager {
    constructor() {
        this.uploadDir = path.join(__dirname, 'uploads');
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        this.allowedAudioTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
        this.allowedDocumentTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ];
        
        this.init();
    }

    async init() {
        try {
            // Создаем папки для загрузок
            await fs.ensureDir(this.uploadDir);
            await fs.ensureDir(path.join(this.uploadDir, 'images'));
            await fs.ensureDir(path.join(this.uploadDir, 'videos'));
            await fs.ensureDir(path.join(this.uploadDir, 'audio'));
            await fs.ensureDir(path.join(this.uploadDir, 'documents'));
            await fs.ensureDir(path.join(this.uploadDir, 'avatars'));
            await fs.ensureDir(path.join(this.uploadDir, 'temp'));
            
            console.log('✅ Файловый менеджер инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации файлового менеджера:', error);
        }
    }

    // Настройка multer для загрузки файлов
    getUploadMiddleware(fieldName = 'file', maxCount = 1) {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const fileType = this.getFileType(file.mimetype);
                const uploadPath = path.join(this.uploadDir, fileType);
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueName = this.generateUniqueFileName(file.originalname);
                cb(null, uniqueName);
            }
        });

        const fileFilter = (req, file, cb) => {
            if (this.isFileTypeAllowed(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`Тип файла ${file.mimetype} не поддерживается`), false);
            }
        };

        return multer({
            storage: storage,
            fileFilter: fileFilter,
            limits: {
                fileSize: this.maxFileSize,
                files: maxCount
            }
        }).array(fieldName, maxCount);
    }

    // Определение типа файла по MIME типу
    getFileType(mimetype) {
        if (this.allowedImageTypes.includes(mimetype)) return 'images';
        if (this.allowedVideoTypes.includes(mimetype)) return 'videos';
        if (this.allowedAudioTypes.includes(mimetype)) return 'audio';
        if (this.allowedDocumentTypes.includes(mimetype)) return 'documents';
        return 'documents'; // По умолчанию
    }

    // Проверка разрешенного типа файла
    isFileTypeAllowed(mimetype) {
        return [
            ...this.allowedImageTypes,
            ...this.allowedVideoTypes,
            ...this.allowedAudioTypes,
            ...this.allowedDocumentTypes
        ].includes(mimetype);
    }

    // Генерация уникального имени файла
    generateUniqueFileName(originalName) {
        const ext = path.extname(originalName);
        const name = path.basename(originalName, ext);
        const uniqueId = uuidv4().substring(0, 8);
        return `${name}_${uniqueId}${ext}`;
    }

    // Обработка загруженного изображения
    async processImage(filePath, options = {}) {
        try {
            const {
                width = 800,
                height = 600,
                quality = 80,
                format = 'jpeg',
                createThumbnail = true
            } = options;

            const image = sharp(filePath);
            const metadata = await image.metadata();

            // Создаем основное изображение
            const processedImage = await image
                .resize(width, height, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality })
                .toBuffer();

            // Сохраняем обработанное изображение
            const processedPath = filePath.replace(/\.[^/.]+$/, `_processed.${format}`);
            await fs.writeFile(processedPath, processedImage);

            // Создаем миниатюру если нужно
            let thumbnailPath = null;
            if (createThumbnail) {
                const thumbnail = await sharp(filePath)
                    .resize(200, 200, { fit: 'cover' })
                    .jpeg({ quality: 70 })
                    .toBuffer();

                thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg');
                await fs.writeFile(thumbnailPath, thumbnail);
            }

            return {
                originalPath: filePath,
                processedPath: processedPath,
                thumbnailPath: thumbnailPath,
                metadata: metadata,
                size: processedImage.length
            };
        } catch (error) {
            console.error('❌ Ошибка обработки изображения:', error);
            throw error;
        }
    }

    // Создание миниатюры для видео
    async createVideoThumbnail(videoPath, outputPath, time = '00:00:01') {
        try {
            // Здесь можно использовать ffmpeg для создания миниатюр
            // Пока возвращаем заглушку
            console.log(`Создание миниатюры для видео: ${videoPath}`);
            return outputPath;
        } catch (error) {
            console.error('❌ Ошибка создания миниатюры видео:', error);
            throw error;
        }
    }

    // Загрузка аватара пользователя
    async uploadAvatar(userId, file) {
        try {
            const avatarDir = path.join(this.uploadDir, 'avatars');
            const avatarName = `avatar_${userId}${path.extname(file.originalname)}`;
            const avatarPath = path.join(avatarDir, avatarName);

            // Обрабатываем изображение для аватара
            const processedAvatar = await this.processImage(file.path, {
                width: 200,
                height: 200,
                quality: 90,
                createThumbnail: false
            });

            // Удаляем временный файл
            await fs.remove(file.path);

            return {
                path: processedAvatar.processedPath,
                size: processedAvatar.size,
                type: file.mimetype
            };
        } catch (error) {
            console.error('❌ Ошибка загрузки аватара:', error);
            throw error;
        }
    }

    // Загрузка файла в чат
    async uploadChatFile(file, chatId, senderId) {
        try {
            const fileType = this.getFileType(file.mimetype);
            const fileInfo = {
                id: uuidv4(),
                originalName: file.originalname,
                fileName: file.filename,
                filePath: file.path,
                fileSize: file.size,
                mimeType: file.mimetype,
                chatId: chatId,
                senderId: senderId,
                uploadDate: new Date()
            };

            // Обрабатываем изображения
            if (fileType === 'images') {
                const processed = await this.processImage(file.path, {
                    width: 1200,
                    height: 800,
                    quality: 85
                });
                fileInfo.processedPath = processed.processedPath;
                fileInfo.thumbnailPath = processed.thumbnailPath;
            }

            return fileInfo;
        } catch (error) {
            console.error('❌ Ошибка загрузки файла в чат:', error);
            throw error;
        }
    }

    // Получение файла по пути
    async getFile(filePath) {
        try {
            const fullPath = path.join(this.uploadDir, filePath);
            const exists = await fs.pathExists(fullPath);
            
            if (!exists) {
                throw new Error('Файл не найден');
            }

            const stats = await fs.stat(fullPath);
            const stream = fs.createReadStream(fullPath);

            return {
                stream: stream,
                stats: stats,
                path: fullPath
            };
        } catch (error) {
            console.error('❌ Ошибка получения файла:', error);
            throw error;
        }
    }

    // Удаление файла
    async deleteFile(filePath) {
        try {
            const fullPath = path.join(this.uploadDir, filePath);
            const exists = await fs.pathExists(fullPath);
            
            if (exists) {
                await fs.remove(fullPath);
                console.log(`✅ Файл удален: ${fullPath}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Ошибка удаления файла:', error);
            throw error;
        }
    }

    // Очистка временных файлов
    async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 часа
        try {
            const tempDir = path.join(this.uploadDir, 'temp');
            const files = await fs.readdir(tempDir);
            const now = Date.now();
            let cleanedCount = 0;

            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.remove(filePath);
                    cleanedCount++;
                }
            }

            console.log(`✅ Очищено временных файлов: ${cleanedCount}`);
            return cleanedCount;
        } catch (error) {
            console.error('❌ Ошибка очистки временных файлов:', error);
            throw error;
        }
    }

    // Получение информации о файле
    async getFileInfo(filePath) {
        try {
            const fullPath = path.join(this.uploadDir, filePath);
            const exists = await fs.pathExists(fullPath);
            
            if (!exists) {
                throw new Error('Файл не найден');
            }

            const stats = await fs.stat(fullPath);
            const ext = path.extname(filePath).toLowerCase();
            
            return {
                name: path.basename(filePath),
                path: filePath,
                size: stats.size,
                type: this.getFileTypeByExtension(ext),
                mimeType: this.getMimeTypeByExtension(ext),
                created: stats.birthtime,
                modified: stats.mtime,
                isImage: this.allowedImageTypes.includes(this.getMimeTypeByExtension(ext)),
                isVideo: this.allowedVideoTypes.includes(this.getMimeTypeByExtension(ext)),
                isAudio: this.allowedAudioTypes.includes(this.getMimeTypeByExtension(ext))
            };
        } catch (error) {
            console.error('❌ Ошибка получения информации о файле:', error);
            throw error;
        }
    }

    // Определение типа файла по расширению
    getFileTypeByExtension(ext) {
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const videoExts = ['.mp4', '.webm', '.ogg', '.avi', '.mov'];
        const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
        
        if (imageExts.includes(ext)) return 'image';
        if (videoExts.includes(ext)) return 'video';
        if (audioExts.includes(ext)) return 'audio';
        return 'document';
    }

    // Получение MIME типа по расширению
    getMimeTypeByExtension(ext) {
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
            '.mp3': 'audio/mp3',
            '.wav': 'audio/wav',
            '.m4a': 'audio/m4a',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain'
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
    }

    // Создание резервной копии файлов
    async createBackup(backupPath) {
        try {
            await fs.copy(this.uploadDir, backupPath);
            console.log(`✅ Резервная копия файлов создана: ${backupPath}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка создания резервной копии файлов:', error);
            return false;
        }
    }

    // Восстановление файлов из резервной копии
    async restoreFromBackup(backupPath) {
        try {
            await fs.copy(backupPath, this.uploadDir);
            console.log(`✅ Файлы восстановлены из: ${backupPath}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка восстановления файлов:', error);
            return false;
        }
    }

    // Получение статистики файлов
    async getFileStats() {
        try {
            const stats = {
                totalFiles: 0,
                totalSize: 0,
                byType: {
                    images: { count: 0, size: 0 },
                    videos: { count: 0, size: 0 },
                    audio: { count: 0, size: 0 },
                    documents: { count: 0, size: 0 },
                    avatars: { count: 0, size: 0 }
                }
            };

            const types = ['images', 'videos', 'audio', 'documents', 'avatars'];
            
            for (const type of types) {
                const typeDir = path.join(this.uploadDir, type);
                const exists = await fs.pathExists(typeDir);
                
                if (exists) {
                    const files = await fs.readdir(typeDir);
                    stats.byType[type].count = files.length;
                    
                    for (const file of files) {
                        const filePath = path.join(typeDir, file);
                        const fileStats = await fs.stat(filePath);
                        stats.byType[type].size += fileStats.size;
                        stats.totalSize += fileStats.size;
                    }
                    
                    stats.totalFiles += files.length;
                }
            }

            return stats;
        } catch (error) {
            console.error('❌ Ошибка получения статистики файлов:', error);
            throw error;
        }
    }
}

module.exports = FileManager;
