package com.matesRace.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND) // Optional: for Spring MVC to automatically return 404
public class RaceNotFoundException extends RuntimeException {

    public RaceNotFoundException(String message) {
        super(message);
    }

    public RaceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}