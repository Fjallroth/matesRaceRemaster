package com.matesRace.backend.repository;
import com.matesRace.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>{
    Optional<User> findByStravaId(Long stravaId);
}
