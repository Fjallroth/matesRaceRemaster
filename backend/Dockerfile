FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: Create the lightweight runtime image
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
# Copy the executable JAR file from the builder stage
COPY --from=builder /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Set Java options to control memory heap size (adjust as needed)
ENV JAVA_OPTS="-Xms256m -Xmx512m" 

# Make port 8080 available
EXPOSE 8080

# Run the JAR file using the configured JAVA_OPTS
ENTRYPOINT ["java", "-jar", "/app/app.jar"]