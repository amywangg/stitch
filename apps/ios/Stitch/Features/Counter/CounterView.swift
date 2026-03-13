import SwiftUI

struct CounterView: View {
    let sectionId: String
    @State private var viewModel = CounterViewModel()

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Progress ring (if target set)
            if let target = viewModel.targetRows, target > 0 {
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.2), lineWidth: 8)
                    Circle()
                        .trim(from: 0, to: viewModel.progress)
                        .stroke(Color(hex: "#FF6B6B"), style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text("\(viewModel.currentRow)")
                        .font(.system(size: 64, weight: .bold, design: .rounded))
                }
                .frame(width: 200, height: 200)
                .padding()
            } else {
                Text("\(viewModel.currentRow)")
                    .font(.system(size: 96, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(hex: "#FF6B6B"))
            }

            if let target = viewModel.targetRows {
                Text("of \(target) rows")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 8)
            }

            Spacer()

            // Large tap targets
            HStack(spacing: 20) {
                Button {
                    Task { await viewModel.decrement() }
                } label: {
                    Image(systemName: "minus")
                        .font(.title.bold())
                        .frame(maxWidth: .infinity, minHeight: 80)
                        .background(Color(hex: "#4ECDC4").opacity(0.15))
                        .foregroundStyle(Color(hex: "#4ECDC4"))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }

                Button {
                    Task { await viewModel.increment() }
                } label: {
                    Image(systemName: "plus")
                        .font(.title.bold())
                        .frame(maxWidth: .infinity, minHeight: 80)
                        .background(Color(hex: "#FF6B6B").opacity(0.15))
                        .foregroundStyle(Color(hex: "#FF6B6B"))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 20)
        }
        .navigationTitle("Counter")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Undo") {
                    Task { await viewModel.undo() }
                }
                .disabled(viewModel.currentRow == 0)
            }
        }
        .task { await viewModel.load(sectionId: sectionId) }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK") { viewModel.error = nil }
        } message: {
            Text(viewModel.error ?? "")
        }
    }
}
