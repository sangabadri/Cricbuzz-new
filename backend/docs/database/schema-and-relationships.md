# Database Schema & Relationships

This document details the PostgreSQL relational database schema, tables, foreign key constraints, relationship cardinalities, and indexes used by Cricbuzz Tracker.

---

## 1. Entity Relationship Diagram (ERD)

```text
+-------------------+             +-------------------+
|       users       | 1         * |   refresh_tokens  |
+-------------------+             +-------------------+
          | 1
          |
          | *
+-------------------+ 1         * +-------------------+
|   match_access    |-------------|      matches      |
+-------------------+             +-------------------+
                                            | 1
         +----------------------------------+----------------------------------+
         | 1                                | 1                                | 1..2
         v *                                v *                                v *
+-------------------+             +-------------------+             +-------------------+
|       teams       | 1         * |      squads       |             |      innings      |
+-------------------+-------------+-------------------+             +-------------------+
         | 1                                | 1                                | 1
         |                                  |                                  |
         | *                                | *                                | *
+-------------------+             +-------------------+             +-------------------+
|      players      |             |   squad_players   |             |    deliveries     |
+-------------------+             +-------------------+             +-------------------+
```

---

## 2. Table Specifications & Constraints

### A. Core Master Tables

#### `teams`
- `id` (INTEGER, Primary Key, Auto-increment)
- `name` (VARCHAR, Unique, Indexed, Not Null)
- `short_name` (VARCHAR(4), Not Null)
- `color_primary` (VARCHAR(7), Nullable)
- `color_secondary` (VARCHAR(7), Nullable)
- `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

#### `players`
- `id` (INTEGER, Primary Key, Auto-increment)
- `team_id` (INTEGER, ForeignKey(`teams.id`, ondelete="CASCADE"), Indexed)
- `name` (VARCHAR, Not Null)
- `role` (VARCHAR, Enum `Role`)
- `batting_style` (VARCHAR, Enum `BattingStyle`)
- `bowling_style` (VARCHAR, Enum `BowlingStyle`)

---

### B. Match & Match Access Tables

#### `matches`
- `id` (INTEGER, Primary Key, Auto-increment)
- `team_a_id` (INTEGER, ForeignKey(`teams.id`))
- `team_b_id` (INTEGER, ForeignKey(`teams.id`))
- `format` (VARCHAR, Enum `MatchFormat`: `t20`, `odi`)
- `status` (VARCHAR, Enum `MatchStatus`: `scheduled`, `toss_done`, `live`, `innings_break`, `completed`, `abandoned`)
- `venue` (VARCHAR, Not Null)
- `date_time` (TIMESTAMP WITH TIME ZONE)
- `overs_limit` (INTEGER)
- `toss_winner_id` (INTEGER, ForeignKey(`teams.id`), Nullable)
- `toss_decision` (VARCHAR, Enum `TossDecision`, Nullable)
- `winner_id` (INTEGER, ForeignKey(`teams.id`), Nullable)
- `result_margin` (INTEGER, Nullable)
- `result_margin_type` (VARCHAR, Nullable)
- `current_innings_id` (INTEGER, Nullable)
- *Note*: Per ADR-0007, `matches` contains no `created_by` column.

#### `match_access` (ADR-0007 Canonical Ownership)
- `id` (INTEGER, Primary Key, Auto-increment)
- `match_id` (INTEGER, ForeignKey(`matches.id`, ondelete="CASCADE"), Indexed)
- `user_id` (INTEGER, ForeignKey(`users.id`, ondelete="CASCADE"), Indexed)
- `role` (VARCHAR, Enum `MatchUserRole`: `owner`, `scorer`, `viewer`)
- Unique constraint: `(match_id, user_id)`.

---

### C. Squads & Playing XI

#### `squads`
- `id` (INTEGER, Primary Key, Auto-increment)
- `match_id` (INTEGER, ForeignKey(`matches.id`, ondelete="CASCADE"), Indexed)
- `team_id` (INTEGER, ForeignKey(`teams.id`, ondelete="CASCADE"), Indexed)
- `captain_id` (INTEGER, ForeignKey(`players.id`))
- `keeper_id` (INTEGER, ForeignKey(`players.id`))
- Unique constraint: `(match_id, team_id)`.

#### `squad_players`
- `id` (INTEGER, Primary Key, Auto-increment)
- `squad_id` (INTEGER, ForeignKey(`squads.id`, ondelete="CASCADE"), Indexed)
- `player_id` (INTEGER, ForeignKey(`players.id`, ondelete="CASCADE"), Indexed)
- `is_playing_xi` (BOOLEAN, Default True)
- Unique constraint: `(squad_id, player_id)`.

---

### D. Innings & Deliveries

#### `innings`
- `id` (INTEGER, Primary Key, Auto-increment)
- `match_id` (INTEGER, ForeignKey(`matches.id`, ondelete="CASCADE"), Indexed)
- `innings_number` (INTEGER, 1 or 2)
- `batting_team_id` (INTEGER, ForeignKey(`teams.id`))
- `bowling_team_id` (INTEGER, ForeignKey(`teams.id`))
- `status` (VARCHAR, Enum `InningsStatus`)
- `total_runs` (INTEGER, Default 0)
- `wickets` (INTEGER, Default 0)
- `overs` (FLOAT, Default 0.0)
- `target_runs` (INTEGER, Nullable)
- Unique constraint: `(match_id, innings_number)`.

#### `deliveries`
- `id` (INTEGER, Primary Key, Auto-increment)
- `innings_id` (INTEGER, ForeignKey(`innings.id`, ondelete="CASCADE"), Indexed)
- `over_number` (INTEGER, 0-indexed)
- `ball_number` (INTEGER, 1-indexed within over)
- `bowler_id` (INTEGER, ForeignKey(`players.id`), Indexed)
- `striker_id` (INTEGER, ForeignKey(`players.id`), Indexed)
- `non_striker_id` (INTEGER, ForeignKey(`players.id`))
- `runs_batter` (INTEGER, 0 to 6)
- `extra_type` (VARCHAR, Enum `ExtraType`, Nullable)
- `extra_runs` (INTEGER, Default 0)
- `is_wicket` (BOOLEAN, Default False)
- `wicket_type` (VARCHAR, Enum `WicketType`, Nullable)
- `dismissed_player_id` (INTEGER, ForeignKey(`players.id`), Nullable)
- `commentary` (VARCHAR, Nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE)

---

### E. Users & Refresh Token Sessions

#### `users`
- `id` (INTEGER, Primary Key, Auto-increment)
- `username` (VARCHAR, Unique, Indexed, Not Null)
- `hashed_password` (VARCHAR, Not Null)
- `is_active` (BOOLEAN, Default True)
- `is_superuser` (BOOLEAN, Default False)

#### `refresh_tokens`
- `id` (INTEGER, Primary Key, Auto-increment)
- `user_id` (INTEGER, ForeignKey(`users.id`, ondelete="CASCADE"), Indexed)
- `token_hash` (VARCHAR, Unique, Indexed, Not Null)
- `expires_at` (TIMESTAMP WITH TIME ZONE, Not Null)
- `is_revoked` (BOOLEAN, Default False)
- `created_at` (TIMESTAMP WITH TIME ZONE)
