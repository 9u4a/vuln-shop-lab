package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.ProductRepository;
import com.vulnlab.shop.security.Roles;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/products")
public class CatalogImportController {

    private final ProductRepository productRepository;

    public CatalogImportController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @PostMapping(value = "/import", consumes = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<?> importCatalog(@RequestBody byte[] xml, HttpSession session) throws Exception {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        if (!Roles.isAdminOrAbove(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "관리자 권한이 필요합니다."));
        }

        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new ByteArrayInputStream(xml));

        List<Map<String, Object>> imported = new ArrayList<>();
        NodeList products = doc.getElementsByTagName("product");
        for (int i = 0; i < products.getLength(); i++) {
            org.w3c.dom.Element el = (org.w3c.dom.Element) products.item(i);
            String name = textOf(el, "name");
            String priceText = textOf(el, "price");
            Map<String, Object> row = new java.util.HashMap<>();
            row.put("name", name);
            try {
                Product product = new Product();
                product.setName(name.length() > 255 ? name.substring(0, 255) : name);
                product.setPrice(priceText.isBlank() ? BigDecimal.ZERO : new BigDecimal(priceText.trim()));
                product.setCategory(textOf(el, "category"));
                productRepository.saveAndFlush(product);
                row.put("id", product.getId());
            } catch (RuntimeException ignored) {
                row.put("id", null);
            }
            imported.add(row);
        }
        return ResponseEntity.ok(Map.of("imported", imported));
    }

    private static String textOf(org.w3c.dom.Element parent, String tag) {
        NodeList nodes = parent.getElementsByTagName(tag);
        return nodes.getLength() == 0 ? "" : nodes.item(0).getTextContent();
    }
}
