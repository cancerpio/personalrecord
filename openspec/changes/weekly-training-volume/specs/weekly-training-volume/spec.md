## ADDED Requirements

### Requirement: Calculate Weekly Training Volume
The system SHALL calculate the weekly training volume for the current calendar week (Monday to Sunday) by summing the product of `sets * reps * weight` for all training sessions in the current week.

#### Scenario: Calculate volume with multiple sessions
- **WHEN** the user has training sessions in the current week with (sets=3, reps=10, weight=100) and (sets=5, reps=5, weight=120)
- **THEN** the weekly training volume SHALL be 4800 (3*10*100 + 5*5*120)

### Requirement: Calculate Historical Average and Trend
The system SHALL calculate the historical weekly training volume average by grouping all past sessions by calendar week (Monday to Sunday, excluding the current week). The system SHALL compare the current week's training volume to this historical average to determine the trend.
- A current volume greater than 105% of the average SHALL be classified as "UP" (上升).
- A current volume less than 95% of the average SHALL be classified as "DOWN" (下降).
- A current volume within 95% to 105% (inclusive) of the average SHALL be classified as "STABLE" (持平).

#### Scenario: Trend is UP
- **WHEN** the current week volume is 5000 and the historical weekly average is 4000
- **THEN** the trend classification SHALL be "UP"

#### Scenario: Trend is DOWN
- **WHEN** the current week volume is 3000 and the historical weekly average is 4000
- **THEN** the trend classification SHALL be "DOWN"

#### Scenario: Trend is STABLE
- **WHEN** the current week volume is 4100 and the historical weekly average is 4000
- **THEN** the trend classification SHALL be "STABLE"

### Requirement: Display Volume and Trend on Homepage
The system SHALL display the current week's training volume and its compared trend on the dashboard page.

#### Scenario: Dashboard rendering
- **WHEN** the user visits the dashboard homepage
- **THEN** the system SHALL show the weekly training volume card with the current total and a trend icon matching the trend classification
