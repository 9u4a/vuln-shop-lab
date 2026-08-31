package com.vulnlab.shop.vuln;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

// 재입고 통지 발송 시 구독자가 등록한 콜백 URL을 서버에서 그대로 요청하고 응답을 반환한다.
public final class CallbackFetcher {

    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private CallbackFetcher() {}

    public static class Result {
        public final int status;
        public final String body;
        public Result(int status, String body) {
            this.status = status;
            this.body = body;
        }
    }

    public static Result fetch(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
        HttpResponse<String> response = CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
        String body = response.body();
        if (body != null && body.length() > 5000) {
            body = body.substring(0, 5000);
        }
        return new Result(response.statusCode(), body);
    }
}
