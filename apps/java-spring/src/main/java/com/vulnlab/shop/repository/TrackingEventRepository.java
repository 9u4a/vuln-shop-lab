package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.TrackingEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrackingEventRepository extends JpaRepository<TrackingEvent, Long> {
    List<TrackingEvent> findByTrackingNoOrderByOccurredAtAscIdAsc(String trackingNo);
}
