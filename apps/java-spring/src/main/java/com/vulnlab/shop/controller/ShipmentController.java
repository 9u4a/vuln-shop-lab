package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Order;
import com.vulnlab.shop.entity.Shipment;
import com.vulnlab.shop.repository.OrderRepository;
import com.vulnlab.shop.repository.ShipmentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/shipments")
@Tag(name = "배송", description = "송장번호 기반 배송 조회")
public class ShipmentController {

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;

    public ShipmentController(ShipmentRepository shipmentRepository, OrderRepository orderRepository) {
        this.shipmentRepository = shipmentRepository;
        this.orderRepository = orderRepository;
    }

    @Operation(summary = "배송 조회 (비회원)", description = "송장번호만으로 배송 상태와 배송지를 조회한다.")
    @GetMapping("/track")
    public ResponseEntity<?> track(@Parameter(description = "송장번호") @RequestParam(value = "no", required = false) String no) {
        if (no == null || no.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "송장번호를 입력해주세요."));
        }
        Shipment s = shipmentRepository.findByTrackingNo(no.trim()).orElse(null);
        if (s == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "배송 정보를 찾을 수 없습니다."));
        }
        Order o = orderRepository.findById(s.getOrderId()).orElse(null);
        Map<String, Object> out = new HashMap<>();
        out.put("carrier", s.getCarrier());
        out.put("trackingNo", s.getTrackingNo());
        out.put("status", s.getStatus());
        out.put("orderId", s.getOrderId());
        if (o != null) {
            out.put("shipName", o.getShipName());
            out.put("shipPhone", o.getShipPhone());
            out.put("shipPostcode", o.getShipPostcode());
            out.put("shipAddress", o.getShipAddress());
            out.put("shipAddressDetail", o.getShipAddressDetail());
        }
        return ResponseEntity.ok(out);
    }
}
