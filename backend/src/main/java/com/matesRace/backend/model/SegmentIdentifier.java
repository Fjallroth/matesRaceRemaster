package com.matesRace.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Objects;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SegmentIdentifier {

    @Column(name = "segment_id", nullable = false) // Column name in the collection table
    private Long segmentId;

    @Column(name = "segment_name")
    private String segmentName;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SegmentIdentifier that = (SegmentIdentifier) o;
        return Objects.equals(segmentId, that.segmentId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(segmentId);
    }
}