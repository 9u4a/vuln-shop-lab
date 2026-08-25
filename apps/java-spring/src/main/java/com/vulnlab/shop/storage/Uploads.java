package com.vulnlab.shop.storage;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

public final class Uploads {

    private static final Set<String> ALLOWED_EXT = Set.of("png", "jpg", "jpeg", "gif", "webp");
    private static final Path UPLOAD_DIR = Paths.get("uploads");

    private Uploads() {}

    public static boolean isAllowed(MultipartFile file) {
        return !file.isEmpty() && ALLOWED_EXT.contains(extensionOf(file));
    }

    public static String store(MultipartFile file) throws IOException {
        Files.createDirectories(UPLOAD_DIR);
        String filename = UUID.randomUUID() + "." + extensionOf(file);
        Files.copy(file.getInputStream(), UPLOAD_DIR.resolve(filename));
        return filename;
    }

    private static String extensionOf(MultipartFile file) {
        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        return original.contains(".") ? original.substring(original.lastIndexOf('.') + 1).toLowerCase() : "";
    }
}
