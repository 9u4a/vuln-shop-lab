package com.vulnlab.shop.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.Paths;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI shopOpenAPI() {
        SecurityScheme sessionCookie = new SecurityScheme()
                .type(SecurityScheme.Type.APIKEY)
                .in(SecurityScheme.In.COOKIE)
                .name("JSESSIONID");

        return new OpenAPI()
                .info(new Info()
                        .title("Vuln Shop API — java-spring")
                        .version("0.1.0")
                        .description("의도적으로 취약한 커머스 API. 관리자 엔드포인트(/api/admin/**)는 이 명세에서 제외됨."))
                .servers(List.of(
                        new Server().url("/api/java").description("nginx 진입점 (http://localhost:8090)"),
                        new Server().url("http://localhost:8081/api").description("WAS 직접")))
                .components(new Components().addSecuritySchemes("sessionCookie", sessionCookie));
    }

    // 오퍼레이션 경로에서 /api 프리픽스를 제거해 servers 의 base URL(/api/java)과 합쳐지도록 한다.
    // node 수기 명세와 path 키 모양을 맞춰 두 스택 명세 diff 가 미러 점검이 되게 한다.
    @Bean
    public OpenApiCustomizer stripApiPrefix() {
        return openApi -> {
            Paths original = openApi.getPaths();
            if (original == null) {
                return;
            }
            Paths rewritten = new Paths();
            original.forEach((key, item) -> {
                String stripped = key.startsWith("/api/") ? key.substring(4) : key;
                rewritten.addPathItem(stripped, item);
            });
            openApi.setPaths(rewritten);
        };
    }
}
